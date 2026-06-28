import { $convertFromMarkdownString } from '@lexical/markdown';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $setSelection,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';

import {
  clearBlockGapsForReExport,
  gapNewlineCount,
  isEmptyRootParagraph,
  recordImportedGapBefore,
  separatorBetweenRootBlocks,
} from './block-gaps';

import {
  clearBlockExportCache,
  getBlockExportCache,
  type MarkdownExportContext,
  $resolveIncrementalExportKeys,
} from './block-export-cache';

import {
  exportStoredTopLevelNode,
  getContentRootBlocks,
  $exportTopLevelBlockMarkdown,
} from './markdown-export';

import { importMixedNestedListMarkdown } from './list-transformers';
import {
  $captureStructuredSelection,
  $restoreStructuredSelection,
  getContainerTextFromLexical,
  getContainerTextFromParsedBlocks,
  remapStructuredPoint,
  type StructuredSelection,
} from '../memory/selection-memory';
import {
  MARKDOWN_TRANSFORMERS,
  INLINE_MARKDOWN_TRANSFORMERS,
} from './transformers';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

export {
  $exportStoredTopLevelBlockMarkdown,
  $exportTopLevelBlockMarkdown,
} from './markdown-export';

type GfmExportOptions = {
  cache?: Map<NodeKey, string>;
  editor?: LexicalEditor;
  markdownExportContext?: MarkdownExportContext;
  reExportKeys?: ReadonlySet<NodeKey>;
};

function $exportGfmMarkdown(options?: GfmExportOptions): string {
  const children = getContentRootBlocks();
  if (children.length === 0) {
    return '';
  }

  const contentChildren = children.filter(
    (child) => !isEmptyRootParagraph(child)
  );
  if (contentChildren.length === 0) {
    return '';
  }

  const cache = options?.cache;
  const editor = options?.editor ?? options?.markdownExportContext?.editor;
  const reExportKeys = options?.reExportKeys;
  const rootChildKeys = children.map((child) => child.getKey());
  let output = '';
  let previousBlock: LexicalNode | null = null;

  for (const child of contentChildren) {
    const childKey = child.getKey();
    const shouldReExport =
      cache === undefined ||
      reExportKeys === undefined ||
      reExportKeys.has(childKey) ||
      !cache.has(childKey);

    if (
      shouldReExport &&
      reExportKeys !== undefined &&
      reExportKeys.has(childKey)
    ) {
      clearBlockGapsForReExport(childKey, rootChildKeys);
    }

    const markdown = shouldReExport
      ? exportStoredTopLevelNode(child, {
          markdownExportContext: options?.markdownExportContext,
        })
      : (cache?.get(childKey) ??
        exportStoredTopLevelNode(child, {
          markdownExportContext: options?.markdownExportContext,
        }));

    if (cache !== undefined && shouldReExport) {
      cache.set(childKey, markdown);
    }

    if (markdown.length === 0) {
      continue;
    }

    if (output.length > 0 && previousBlock !== null) {
      output += separatorBetweenRootBlocks(previousBlock, child);
    }

    previousBlock = child;
    output += markdown;
  }

  return output;
}

function $exportGfmMarkdownIncremental(context: MarkdownExportContext): string {
  const cache = getBlockExportCache(context.editor);
  const reExportKeys = $resolveIncrementalExportKeys(context);

  if (cache.size === 0) {
    return $exportGfmMarkdown({
      cache,
      editor: context.editor,
      markdownExportContext: context,
    });
  }

  return $exportGfmMarkdown({
    cache,
    editor: context.editor,
    markdownExportContext: context,
    reExportKeys,
  });
}

export function $exportMarkdownString(context?: MarkdownExportContext): string {
  if (context === undefined) {
    return $exportGfmMarkdown();
  }

  return $exportGfmMarkdownIncremental(context);
}

export function $exportMarkdownStringForEditor(_editor: LexicalEditor): string {
  return $exportGfmMarkdown();
}

/** Assemble markdown from cache, re-exporting only the given root block keys. */
export function $exportMarkdownStringFromEditorCache(
  editor: MarkdownExportContext['editor'],
  reExportKeys: ReadonlySet<NodeKey> = new Set()
): string {
  const cache = getBlockExportCache(editor);
  if (cache.size === 0) {
    return $exportGfmMarkdown({ editor });
  }

  return $exportGfmMarkdown({ cache, editor, reExportKeys });
}

export {
  clearBlockExportCache,
  type MarkdownExportContext,
} from './block-export-cache';

type ImportChunkPart =
  | { kind: 'gap'; text: string }
  | { kind: 'markdown'; text: string };

type ImportChunkContext = {
  editor?: LexicalEditor;
  pendingGapNewlines: number;
  recordBlocks: (nodes: LexicalNode[]) => void;
};

function $tryFenceStart(
  chunk: string,
  index: number
): { headerLength: number; marker: '```' | '~~~' } | null {
  if (index > 0 && chunk[index - 1] !== '\n') {
    return null;
  }

  const match = chunk.slice(index).match(/^(```|~~~)([^\n]*)\n/);
  if (match === null) {
    return null;
  }

  return {
    headerLength: match[0].length,
    marker: match[1] as '```' | '~~~',
  };
}

function $findFencedCodeBlockEnd(
  chunk: string,
  contentStart: number,
  marker: '```' | '~~~'
): number | null {
  const endFenceRegex = new RegExp(`\\n${marker}[ \\t]*(?:\\n|$)`);
  const match = endFenceRegex.exec(chunk.slice(contentStart));
  if (match === null) {
    return null;
  }

  const matchEnd = contentStart + match.index + match[0].length;
  if (match[0].endsWith('\n') && matchEnd < chunk.length) {
    return matchEnd - 1;
  }

  return matchEnd;
}

function $splitImportChunkParts(chunk: string): ImportChunkPart[] {
  const parts: ImportChunkPart[] = [];
  let index = 0;

  while (index < chunk.length) {
    const fenceStart = $tryFenceStart(chunk, index);
    if (fenceStart !== null) {
      const contentStart = index + fenceStart.headerLength;
      const blockEnd =
        $findFencedCodeBlockEnd(chunk, contentStart, fenceStart.marker) ??
        chunk.length;
      parts.push({ kind: 'markdown', text: chunk.slice(index, blockEnd) });
      index = blockEnd;
      continue;
    }

    const gapMatch = chunk.slice(index).match(/^\n{2,}/);
    if (gapMatch !== null) {
      parts.push({ kind: 'gap', text: gapMatch[0] });
      index += gapMatch[0].length;
      continue;
    }

    let nextIndex = chunk.length;
    const gapIndex = chunk.slice(index).search(/\n{2,}/);
    if (gapIndex > 0) {
      nextIndex = index + gapIndex;
    }

    const fenceMatch = chunk.slice(index).match(/\n(```|~~~)[^\n]*\n/);
    if (fenceMatch?.index !== undefined) {
      nextIndex = Math.min(nextIndex, index + fenceMatch.index + 1);
    }

    parts.push({ kind: 'markdown', text: chunk.slice(index, nextIndex) });
    index = nextIndex;
  }

  return parts;
}

function importMarkdownSegment(segment: string, target: ElementNode): void {
  const container = $createParagraphNode();
  target.append(container);
  $convertFromMarkdownString(segment, MARKDOWN_TRANSFORMERS, container);
  if (container.getParent() === null) {
    return;
  }
  if (container.getNextSibling() === null) {
    const children = container.getChildren();
    container.remove();
    target.append(...children);
  } else {
    for (const child of container.getChildren()) {
      container.insertBefore(child);
    }
    container.remove();
  }
}

function $ensureAttachedSelection(
  previousSelection: ReturnType<
    NonNullable<typeof $getSelection>['clone']
  > | null
): void {
  const nodes = $getSelection()?.getNodes() ?? [];
  if (nodes.length > 0 && nodes.every((node) => node.isAttached())) {
    return;
  }

  if (previousSelection !== null) {
    $setSelection(previousSelection);
    const restored = $getSelection()?.getNodes() ?? [];
    if (restored.length > 0 && restored.every((node) => node.isAttached())) {
      return;
    }
  }

  $getRoot().selectStart();
}

/** Import one root block's markdown without list-run line grouping. */
export function $importRootBlockMarkdown(markdown: string): LexicalNode[] {
  const previousSelection = $getSelection()?.clone() ?? null;
  const holder = $createParagraphNode();
  importMarkdownSegment(markdown, holder);
  const imported: LexicalNode[] = [];
  for (const child of holder.getChildren()) {
    child.remove();
    imported.push(child);
  }
  $ensureAttachedSelection(previousSelection);
  return imported;
}

function appendImportedBlocks(
  target: ElementNode,
  importContext: ImportChunkContext,
  importFn: () => void
): void {
  const beforeCount = target.getChildrenSize();
  importFn();
  const newChildren = target.getChildren().slice(beforeCount);
  importContext.recordBlocks(newChildren);
}

function $importChunk(
  chunk: string,
  target: ElementNode,
  importContext: ImportChunkContext
): void {
  if (/^\s*$/.test(chunk)) {
    if (chunk.length === 0) {
      target.append($createParagraphNode());
      return;
    }

    importContext.pendingGapNewlines = gapNewlineCount(chunk);
    return;
  }

  if (!chunk.includes('\n\n')) {
    appendImportedBlocks(target, importContext, () =>
      importMarkdownSegment(chunk, target)
    );
    return;
  }

  const parts = $splitImportChunkParts(chunk);
  for (const part of parts) {
    if (part.kind === 'markdown') {
      if (part.text.length > 0) {
        appendImportedBlocks(target, importContext, () =>
          importMarkdownSegment(part.text, target)
        );
      }
      continue;
    }

    importContext.pendingGapNewlines = gapNewlineCount(part.text);
  }
}

export function $importMarkdownString(
  markdown: string,
  editor?: LexicalEditor
): void {
  const root = $getRoot();
  root.clear();

  const importContext: ImportChunkContext = {
    editor,
    pendingGapNewlines: 0,
    recordBlocks: (nodes) => {
      for (const node of nodes) {
        recordImportedGapBefore(node, importContext.pendingGapNewlines);
        importContext.pendingGapNewlines = 0;
      }
    },
  };

  importMixedNestedListMarkdown(
    markdown,
    root,
    (chunk, target) => $importChunk(chunk, target, importContext),
    INLINE_MARKDOWN_TRANSFORMERS,
    importContext
  );

  if (root.getChildrenSize() === 0) {
    root.append($createParagraphNode());
  }
}

export type MarkdownViewSelectionSnapshot = {
  structuredSelection: StructuredSelection;
  localMarkdown: string;
  localTexts: {
    anchor: string | null;
    focus: string | null;
  };
};

export function $captureMarkdownViewSelection(
  editor?: LexicalEditor
): MarkdownViewSelectionSnapshot | null {
  const structuredSelection = $captureStructuredSelection();
  if (structuredSelection === null) {
    return null;
  }

  const localMarkdown =
    editor !== undefined
      ? $exportMarkdownStringForEditor(editor)
      : $exportMarkdownString();

  return {
    structuredSelection,
    localMarkdown,
    localTexts: {
      anchor: getContainerTextFromLexical(structuredSelection.anchor),
      focus: getContainerTextFromLexical(structuredSelection.focus),
    },
  };
}

export function $restoreMarkdownViewSelection(
  remoteMarkdown: string,
  saved: MarkdownViewSelectionSnapshot
): boolean {
  const remapped = remapStructuredSelection(
    saved.localMarkdown,
    remoteMarkdown,
    saved.structuredSelection,
    saved.localTexts
  );

  if (!$restoreStructuredSelection(remapped)) {
    $getRoot().selectStart();
    return false;
  }

  return true;
}

export function $importRemoteMarkdown(
  remote: string,
  _local: string = remote,
  options?: { editor?: LexicalEditor; preserveSelection?: boolean }
): void {
  const preserveSelection = options?.preserveSelection ?? true;
  const saved = preserveSelection
    ? $captureMarkdownViewSelection(options?.editor)
    : null;

  $importMarkdownString(remote, options?.editor);

  if (saved === null) {
    $getRoot().selectStart();
    return;
  }

  $restoreMarkdownViewSelection(remote, saved);
}

function remapStructuredSelection(
  local: string,
  remote: string,
  saved: StructuredSelection,
  localTexts: { anchor: string | null; focus: string | null }
): StructuredSelection {
  if (local === remote) {
    return saved;
  }

  const remoteBlocks = $markdownToNodes(remote);
  try {
    return {
      anchor: remapStructuredPoint(
        localTexts.anchor,
        getContainerTextFromParsedBlocks(remoteBlocks, saved.anchor),
        saved.anchor
      ),
      focus: remapStructuredPoint(
        localTexts.focus,
        getContainerTextFromParsedBlocks(remoteBlocks, saved.focus),
        saved.focus
      ),
      direction: saved.direction,
    };
  } finally {
    for (const block of remoteBlocks) {
      block.remove();
    }
  }
}

// Re-parse a root paragraph through markdown import so block syntax on any line
// (e.g. `---`) becomes structure. No-op when import would still yield one paragraph.
export function $reimportRootParagraphIfNeeded(
  paragraph: ElementNode
): boolean {
  if (
    !$isParagraphNode(paragraph) ||
    paragraph.getParent()?.getType() !== 'root'
  ) {
    return false;
  }

  const markdown = $exportTopLevelBlockMarkdown(paragraph);
  const imported = paragraph.getChildren().some($isLineBreakNode)
    ? $importRootBlockMarkdown(markdown)
    : $markdownToNodes(markdown);

  if (imported.length === 0) {
    return false;
  }

  if (imported.length === 1 && $isParagraphNode(imported[0])) {
    imported[0].remove();
    return false;
  }

  // Hard-break paragraphs export as `line\nline`. Block reimport treats bare
  // newlines as paragraph breaks, so skip when no block structure is produced.
  if (
    paragraph.getChildren().some($isLineBreakNode) &&
    imported.every($isParagraphNode)
  ) {
    for (const node of imported) {
      node.remove();
    }
    return false;
  }

  const previousSelection = $getSelection()?.clone() ?? null;
  const parent = paragraph.getParent()!;
  const previousSibling = paragraph.getPreviousSibling();
  paragraph.remove();

  let anchor: LexicalNode | null = previousSibling;
  for (const node of imported) {
    if (anchor === null) {
      const firstChild = parent.getFirstChild();
      if (firstChild !== null) {
        firstChild.insertBefore(node);
      } else {
        parent.append(node);
      }
    } else {
      anchor.insertAfter(node);
    }
    anchor = node;
  }

  if (previousSelection !== null) {
    $setSelection(previousSelection);
  }

  return true;
}

export function $markdownToNodes(markdown: string): LexicalNode[] {
  const previousSelection = $getSelection()?.clone() ?? null;

  const holder = $createParagraphNode();
  const importContext: ImportChunkContext = {
    pendingGapNewlines: 0,
    recordBlocks: () => {},
  };
  importMixedNestedListMarkdown(
    markdown,
    holder,
    (chunk, target) => $importChunk(chunk, target, importContext),
    INLINE_MARKDOWN_TRANSFORMERS,
    importContext
  );
  const children = holder.getChildren();
  for (const child of children) {
    child.remove();
  }

  $setSelection(previousSelection);
  return children;
}
