import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isLinkNode } from '@lexical/link';
import { $isListNode, type ListNode } from '@lexical/list';
import { $isTableNode } from '@lexical/table';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
  type TextNode,
} from 'lexical';

import {
  clearBlockExportCache,
  getBlockExportCache,
  type MarkdownExportContext,
  $resolveIncrementalExportKeys,
} from './block-export-cache';
import { $exportTableNodeMarkdown } from './gfm-transformers';
import { $exportTableMarkdown } from './table-export-cache';

import {
  importMixedNestedListMarkdown,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
} from './list-transformers';
import {
  $captureStructuredSelection,
  $restoreStructuredSelection,
  getContainerTextFromLexical,
  getContainerTextFromParsedBlocks,
  remapStructuredPoint,
  type StructuredSelection,
} from './selection-memory';
import {
  INLINE_MARKDOWN_TRANSFORMERS,
  MARKDOWN_TRANSFORMERS,
} from './transformers';
import { $isTransientParagraphNode } from './transient-paragraph-node';

// Line-native gaps: a run of (N + 1) newlines encodes N empty root paragraphs.
// Single \n inside exported block text is a hard line break within a paragraph.
function emptyParagraphsInGap(gap: string): number {
  const newlineCount = (gap.match(/\n/g) || []).length;
  return newlineCount >= 2 ? newlineCount - 1 : 0;
}

function gapForEmptyParagraphCount(emptyCount: number): string {
  if (emptyCount <= 0) {
    return '';
  }
  return '\n'.repeat(emptyCount + 1);
}

function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isParagraphNode(node) &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

function isPlainContentParagraph(node: LexicalNode): boolean {
  return $isParagraphNode(node) && !isEmptyRootParagraph(node);
}

function blockSeparatorForExport(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode,
  pendingEmpty: number
): string {
  if (pendingEmpty > 0) {
    return gapForEmptyParagraphCount(pendingEmpty);
  }

  if (
    isPlainContentParagraph(previousBlock) &&
    isPlainContentParagraph(nextBlock)
  ) {
    return gapForEmptyParagraphCount(1);
  }

  return '\n';
}

function exportTextNodeInline(node: TextNode): string {
  let text = node.getTextContent();
  if (node.hasFormat('code')) {
    text = `\`${text}\``;
  }
  if (node.hasFormat('bold')) {
    text = `**${text}**`;
  }
  if (node.hasFormat('italic')) {
    text = `*${text}*`;
  }
  if (node.hasFormat('strikethrough')) {
    text = `~~${text}~~`;
  }
  return text;
}

function exportListNodeContent(node: ElementNode): string {
  if ($isListNode(node)) {
    return exportListNode(node);
  }

  const chunks: string[] = [];
  for (const child of node.getChildren()) {
    if ($isListNode(child)) {
      continue;
    }
    if ($isParagraphNode(child)) {
      chunks.push(
        $convertToMarkdownString(INLINE_MARKDOWN_TRANSFORMERS, child)
      );
      continue;
    }
    if ($isLinkNode(child)) {
      chunks.push(`[${child.getTextContent()}](${child.getURL()})`);
      continue;
    }
    if ($isLineBreakNode(child)) {
      chunks.push('\n');
      continue;
    }
    if ($isTextNode(child)) {
      chunks.push(exportTextNodeInline(child));
      continue;
    }
    if ($isElementNode(child)) {
      chunks.push(exportListNodeContent(child));
    }
  }

  return chunks.join('');
}

function exportListNode(node: ListNode): string {
  const listType = node.getListType();
  const transformer =
    listType === 'check'
      ? MIXED_NESTED_CHECK_LIST
      : listType === 'number'
        ? MIXED_NESTED_ORDERED_LIST
        : MIXED_NESTED_UNORDERED_LIST;

  if (!transformer.export) {
    return '';
  }

  return transformer.export(node, exportListNodeContent, undefined) ?? '';
}

/** Markdown for one root-level block (shortcut history reconciliation). */
export function $exportTopLevelBlockMarkdown(node: LexicalNode): string {
  return exportTopLevelNode(node);
}

function exportTopLevelNode(
  node: LexicalNode,
  options?: Pick<LineNativeExportOptions, 'markdownExportContext'>
): string {
  if ($isHorizontalRuleNode(node)) {
    return '---';
  }

  if (!$isElementNode(node)) {
    return node.getTextContent();
  }

  // Selection-scoped export walks every list item checking isSelected() — O(n)
  // with a large constant on long lists. We always export the whole block here,
  // so lists can use the direct node export instead.
  if ($isListNode(node)) {
    return exportListNode(node).replace(/^\n+/, '');
  }

  if ($isTableNode(node)) {
    const markdown =
      options?.markdownExportContext === undefined
        ? $exportTableNodeMarkdown(node)
        : $exportTableMarkdown(node, options.markdownExportContext);
    return markdown.replace(/^\n+/, '');
  }

  const selection = $createRangeSelection();
  const key = node.getKey();
  selection.anchor.set(key, 0, 'element');
  selection.focus.set(key, node.getChildrenSize(), 'element');

  return $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');
}

type LineNativeExportOptions = {
  cache?: Map<NodeKey, string>;
  markdownExportContext?: MarkdownExportContext;
  reExportKeys?: ReadonlySet<NodeKey>;
};

function $exportLineNativeMarkdown(options?: LineNativeExportOptions): string {
  const children = $getRoot().getChildren();
  if (children.length === 0) {
    return '';
  }

  if (children.every(isEmptyRootParagraph)) {
    return gapForEmptyParagraphCount(children.length);
  }

  const cache = options?.cache;
  const reExportKeys = options?.reExportKeys;
  let output = '';
  let pendingEmpty = 0;
  let previousBlock: LexicalNode | null = null;

  for (const child of children) {
    if ($isTransientParagraphNode(child)) {
      continue;
    }

    if (isEmptyRootParagraph(child)) {
      pendingEmpty++;
      continue;
    }

    const childKey = child.getKey();
    const shouldReExport =
      cache === undefined ||
      reExportKeys === undefined ||
      reExportKeys.has(childKey) ||
      !cache.has(childKey);
    const markdown = shouldReExport
      ? exportTopLevelNode(child, options)
      : (cache.get(childKey) ?? exportTopLevelNode(child, options));

    if (cache !== undefined && shouldReExport) {
      cache.set(childKey, markdown);
    }

    if (markdown.length === 0) {
      continue;
    }

    if (output.length > 0 && previousBlock !== null) {
      output += blockSeparatorForExport(previousBlock, child, pendingEmpty);
    } else if (pendingEmpty > 0) {
      output += gapForEmptyParagraphCount(pendingEmpty);
    }

    pendingEmpty = 0;
    previousBlock = child;
    output += markdown;
  }

  if (output.length > 0 && pendingEmpty > 0) {
    output += gapForEmptyParagraphCount(pendingEmpty);
  }

  return output;
}

function $exportLineNativeMarkdownIncremental(
  context: MarkdownExportContext
): string {
  const cache = getBlockExportCache(context.editor);
  const reExportKeys = $resolveIncrementalExportKeys(context);

  // Cold cache: one full pass seeds entries for subsequent edits.
  if (cache.size === 0) {
    return $exportLineNativeMarkdown({ cache, markdownExportContext: context });
  }

  return $exportLineNativeMarkdown({
    cache,
    markdownExportContext: context,
    reExportKeys,
  });
}

export function $exportMarkdownString(context?: MarkdownExportContext): string {
  if (context === undefined) {
    return $exportLineNativeMarkdown();
  }

  return $exportLineNativeMarkdownIncremental(context);
}

/** Assemble markdown from cache, re-exporting only the given root block keys. */
export function $exportMarkdownStringFromEditorCache(
  editor: MarkdownExportContext['editor'],
  reExportKeys: ReadonlySet<NodeKey> = new Set()
): string {
  const cache = getBlockExportCache(editor);
  if (cache.size === 0) {
    return $exportLineNativeMarkdown();
  }

  return $exportLineNativeMarkdown({ cache, reExportKeys });
}

export {
  clearBlockExportCache,
  type MarkdownExportContext,
} from './block-export-cache';

type ImportChunkPart =
  | { kind: 'gap'; text: string }
  | { kind: 'markdown'; text: string };

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
  // Only allow trailing spaces/tabs on the closing fence line — not blank lines.
  const endFenceRegex = new RegExp(`\\n${marker}[ \\t]*(?:\\n|$)`);
  const match = endFenceRegex.exec(chunk.slice(contentStart));
  if (match === null) {
    return null;
  }

  const matchEnd = contentStart + match.index + match[0].length;
  // Leave the closing fence line's trailing newline for gap parsing when
  // more markdown follows — line-native gaps count from block boundaries.
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

function appendEmptyParagraphsFromGap(gap: string, target: ElementNode): void {
  for (let j = 0; j < emptyParagraphsInGap(gap); j++) {
    target.append($createParagraphNode());
  }
}

// $convertFromMarkdownString clears its target node, so each chunk is
// imported into a temporary container first, then the resulting blocks
// are hoisted out. Leaving blocks nested inside the container paragraph
// breaks element-level markdown shortcuts (they require blocks to be
// direct children of the root) and corrupts markdown export.
function $importChunk(chunk: string, target: ElementNode): void {
  if (/^\s*$/.test(chunk)) {
    if (chunk.length === 0) {
      target.append($createParagraphNode());
      return;
    }

    appendEmptyParagraphsFromGap(chunk, target);
    return;
  }

  if (!chunk.includes('\n\n')) {
    importMarkdownSegment(chunk, target);
    return;
  }

  const parts = $splitImportChunkParts(chunk);
  for (const part of parts) {
    if (part.kind === 'markdown') {
      if (part.text.length > 0) {
        importMarkdownSegment(part.text, target);
      }
      continue;
    }

    appendEmptyParagraphsFromGap(part.text, target);
  }
}

export function $importMarkdownString(markdown: string): void {
  const root = $getRoot();
  root.clear();
  importMixedNestedListMarkdown(
    markdown,
    root,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
}

/** Re-import remote markdown while keeping the caret in the same place. */
export function $importRemoteMarkdown(
  remote: string,
  local: string = remote,
  options?: { preserveSelection?: boolean }
): void {
  const preserveSelection = options?.preserveSelection ?? true;
  const saved = preserveSelection ? $captureStructuredSelection() : null;
  const localTexts =
    saved === null
      ? { anchor: null, focus: null }
      : {
          anchor: getContainerTextFromLexical(saved.anchor),
          focus: getContainerTextFromLexical(saved.focus),
        };

  $importMarkdownString(remote);

  if (saved === null) {
    $getRoot().selectStart();
    return;
  }

  const remapped = remapStructuredSelection(local, remote, saved, localTexts);

  if (!$restoreStructuredSelection(remapped)) {
    $getRoot().selectStart();
  }
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

/**
 * Parses a markdown string into block nodes without touching the document,
 * e.g. for inserting pasted markdown at the current selection.
 */
export function $markdownToNodes(markdown: string): LexicalNode[] {
  // $convertFromMarkdownString moves the selection to the start of its
  // target node, so preserve the caller's selection across the conversion.
  const previousSelection = $getSelection()?.clone() ?? null;

  const holder = $createParagraphNode();
  importMixedNestedListMarkdown(
    markdown,
    holder,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
  const children = holder.getChildren();
  for (const child of children) {
    child.remove();
  }

  $setSelection(previousSelection);
  return children;
}
