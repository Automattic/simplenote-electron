import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isLinkNode } from '@lexical/link';
import { $isListNode, type ListNode } from '@lexical/list';
import { $isTableNode } from '@lexical/table';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type BaseSelection,
  type ElementNode,
  type LexicalNode,
  type NodeKey,
  type PointType,
  type RangeSelection,
  type TextNode,
} from 'lexical';

import { $convertSelectionToMarkdownString } from '@lexical/markdown';

import {
  blockSeparatorForExport,
  gapForEmptyParagraphCount,
} from './block-separator-export';

import { IMPORT_MARKDOWN_TAG } from './on-change';
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
} from '../memory/selection-memory';
import {
  $exportElementMarkdown,
  $exportInlineMarkdown,
  $importInlineMarkdown,
} from './lexical-io';
import {
  INLINE_MARKDOWN_TRANSFORMERS,
  MARKDOWN_TRANSFORMERS,
} from './transformers';
import {
  $createEmptyLineParagraphNode,
  $isEmptyLineParagraphNode,
  countEmptyLinePlaceholderLines,
  EMPTY_LINE_MARKDOWN_EXPORT,
  isEmptyLinePlaceholderMarkdown,
} from '../nodes/empty-line-paragraph-node';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';
import type { Transformer } from '@lexical/markdown';

export {
  $exportElementMarkdown,
  $exportInlineMarkdown,
  $importInlineMarkdown,
} from './lexical-io';

// Block boundaries use \n\n (standard markdown). Intentional blank lines
// between blocks export as non-breaking-space paragraphs so external renderers
// gap. Legacy notes may still import extra newlines (\n\n\n); those become
// empty-line paragraphs on import. Intra-block line breaks export as GFM hard
// breaks (two trailing spaces).
const GFM_HARD_LINE_BREAK_SUFFIX = '  ';

function getElementTransformers(): Array<ElementTransformer> {
  return MARKDOWN_TRANSFORMERS.filter(
    (transformer): transformer is ElementTransformer =>
      transformer.type === 'element'
  );
}

function isBlockSyntaxLine(line: string): boolean {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) {
    return false;
  }

  return getElementTransformers().some(({ regExp }) => {
    const match = trimmed.match(regExp);
    return match !== null && match[0] === trimmed;
  });
}

function lineAlreadyHasHardLineBreakSuffix(line: string): boolean {
  return /\\$/.test(line) || / {2,}$/.test(line);
}

/** Two trailing spaces before single newlines within one exported block. */
export function formatIntraBlockHardLineBreaks(markdown: string): string {
  if (!markdown.includes('\n')) {
    return markdown;
  }

  const lines = markdown.split('\n');
  const formatted: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    let line = lines[index]!;
    if (
      index < lines.length - 1 &&
      !isBlockSyntaxLine(line) &&
      !lineAlreadyHasHardLineBreakSuffix(line)
    ) {
      line += GFM_HARD_LINE_BREAK_SUFFIX;
    }
    formatted.push(line);
  }

  return formatted.join('\n');
}

function emptyParagraphsInGap(gap: string): number {
  const newlineCount = (gap.match(/\n/g) || []).length;
  return newlineCount >= 2 ? newlineCount - 2 : 0;
}

function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isParagraphNode(node) &&
    !$isTransientParagraphNode(node) &&
    !$isEmptyLineParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
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
      chunks.push($exportInlineMarkdown(child, INLINE_MARKDOWN_TRANSFORMERS));
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

  return formatIntraBlockHardLineBreaks(chunks.join(''));
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
  return $exportBlockMarkdown(node);
}

export function $exportBlockMarkdown(
  node: LexicalNode,
  options?: Pick<LineNativeExportOptions, 'markdownExportContext'>
): string {
  return exportTopLevelNode(node, options);
}

function normalizeTopLevelBlockMarkdown(markdown: string): string {
  return markdown.replace(/^\n+/, '').replace(/\n+$/, '');
}

function exportTopLevelNode(
  node: LexicalNode,
  options?: Pick<LineNativeExportOptions, 'markdownExportContext'>
): string {
  if ($isEmptyLineParagraphNode(node)) {
    return EMPTY_LINE_MARKDOWN_EXPORT;
  }

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
    return normalizeTopLevelBlockMarkdown(exportListNode(node));
  }

  if ($isTableNode(node)) {
    const markdown =
      options?.markdownExportContext === undefined
        ? $exportTableNodeMarkdown(node)
        : $exportTableMarkdown(node, options.markdownExportContext);
    return normalizeTopLevelBlockMarkdown(markdown);
  }

  const markdown = $exportElementMarkdown(node, MARKDOWN_TRANSFORMERS);
  return normalizeTopLevelBlockMarkdown(
    $isParagraphNode(node) ? formatIntraBlockHardLineBreaks(markdown) : markdown
  );
}

type LineNativeExportOptions = {
  cache?: Map<NodeKey, string>;
  markdownExportContext?: MarkdownExportContext;
  reExportKeys?: ReadonlySet<NodeKey>;
};

function $exportRootChildrenLineNativeMarkdown(
  children: LexicalNode[],
  options?: LineNativeExportOptions
): string {
  if (children.length === 0) {
    return '';
  }

  const contentChildren = children.filter(
    (child) => !$isTransientParagraphNode(child)
  );
  if (contentChildren.length === 0) {
    return '';
  }

  if (contentChildren.every($isEmptyLineParagraphNode)) {
    return Array.from(
      { length: contentChildren.length },
      () => EMPTY_LINE_MARKDOWN_EXPORT
    ).join('\n\n');
  }

  if (contentChildren.every(isEmptyRootParagraph)) {
    return gapForEmptyParagraphCount(contentChildren.length);
  }

  const cache = options?.cache;
  const reExportKeys = options?.reExportKeys;
  let output = '';
  let pendingEmpty = 0;
  let previousBlock: LexicalNode | null = null;

  for (const child of contentChildren) {
    if ($isEmptyLineParagraphNode(child)) {
      const markdown = EMPTY_LINE_MARKDOWN_EXPORT;
      if (output.length > 0 && previousBlock !== null) {
        output += blockSeparatorForExport(previousBlock, child, 0);
      }
      previousBlock = child;
      output += markdown;
      pendingEmpty = 0;
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

function $exportLineNativeMarkdown(options?: LineNativeExportOptions): string {
  return $exportRootChildrenLineNativeMarkdown(
    $getRoot().getChildren(),
    options
  );
}

function $getRootBlocksInSelectionOrder(
  selection: RangeSelection
): LexicalNode[] {
  const root = $getRoot();
  const children = root
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));

  const anchorOnRoot = selection.anchor.getNode().is(root);
  const focusOnRoot = selection.focus.getNode().is(root);
  if (
    anchorOnRoot &&
    focusOnRoot &&
    selection.anchor.type === 'element' &&
    selection.focus.type === 'element'
  ) {
    const lo = Math.min(selection.anchor.offset, selection.focus.offset);
    const hi = Math.max(selection.anchor.offset, selection.focus.offset);
    return children.slice(lo, hi);
  }

  const start = selection.isBackward() ? selection.focus : selection.anchor;
  const end = selection.isBackward() ? selection.anchor : selection.focus;
  const startTop = start.getNode().getTopLevelElement();
  const endTop = end.getNode().getTopLevelElement();
  if (startTop === null || endTop === null) {
    return [];
  }

  const startIdx = children.findIndex((child) => child.is(startTop));
  const endIdx = children.findIndex((child) => child.is(endTop));
  if (startIdx < 0 || endIdx < 0) {
    return [];
  }

  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);
  return children.slice(lo, hi + 1);
}

function $pointCoversElementStart(
  block: LexicalNode,
  point: PointType
): boolean {
  if (point.type === 'element' && point.getNode().is(block)) {
    return point.offset === 0;
  }

  const firstDescendant = block.getFirstDescendant();
  return (
    firstDescendant !== null &&
    point.getNode().is(firstDescendant) &&
    point.offset === 0
  );
}

function $pointCoversElementEnd(block: LexicalNode, point: PointType): boolean {
  if (point.type === 'element' && point.getNode().is(block)) {
    return point.offset === block.getChildrenSize();
  }

  const lastDescendant = block.getLastDescendant();
  if (lastDescendant === null) {
    return point.type === 'element' && point.getNode().is(block);
  }

  if (!$isTextNode(lastDescendant)) {
    return point.getNode().is(lastDescendant);
  }

  return (
    point.getNode().is(lastDescendant) &&
    point.offset === lastDescendant.getTextContentSize()
  );
}

function $shouldExportSelectionWithLineNative(
  selection: RangeSelection,
  blocks: LexicalNode[]
): boolean {
  const root = $getRoot();
  if (
    selection.anchor.getNode().is(root) &&
    selection.focus.getNode().is(root) &&
    selection.anchor.type === 'element'
  ) {
    return true;
  }

  if (!blocks.some($isEmptyLineParagraphNode)) {
    return false;
  }

  const children = root
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
  const start = selection.isBackward() ? selection.focus : selection.anchor;
  const end = selection.isBackward() ? selection.anchor : selection.focus;
  const startTop = start.getNode().getTopLevelElement();
  const endTop = end.getNode().getTopLevelElement();
  if (startTop === null || endTop === null) {
    return false;
  }

  const startIdx = children.findIndex((child) => child.is(startTop));
  const endIdx = children.findIndex((child) => child.is(endTop));
  if (startIdx < 0 || endIdx < 0) {
    return false;
  }

  const lo = Math.min(startIdx, endIdx);
  const hi = Math.max(startIdx, endIdx);

  for (let index = lo; index <= hi; index++) {
    const block = children[index];
    if (block === undefined || $isEmptyLineParagraphNode(block)) {
      continue;
    }
    if (index > lo && index < hi) {
      continue;
    }
    if (index === lo && index === hi) {
      if (
        !$pointCoversElementStart(block, start) ||
        !$pointCoversElementEnd(block, end)
      ) {
        return false;
      }
      continue;
    }
    if (index === lo && !$pointCoversElementStart(block, start)) {
      return false;
    }
    if (index === hi && !$pointCoversElementEnd(block, end)) {
      return false;
    }
  }

  return true;
}

export function $exportSelectionToMarkdown(
  selection: BaseSelection,
  transformers: Array<Transformer>
): string {
  if (!$isRangeSelection(selection)) {
    return '';
  }

  const blocks = $getRootBlocksInSelectionOrder(selection);
  if (
    blocks.length > 0 &&
    $shouldExportSelectionWithLineNative(selection, blocks)
  ) {
    return $exportRootChildrenLineNativeMarkdown(blocks).replace(/^\n+/, '');
  }

  return $convertSelectionToMarkdownString(transformers, selection).replace(
    /^\n+/,
    ''
  );
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
  $importInlineMarkdown(segment, container, MARKDOWN_TRANSFORMERS);
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

function $importMarkdownSegmentOrEmptyLine(
  segment: string,
  target: ElementNode
): void {
  if (isEmptyLinePlaceholderMarkdown(segment)) {
    target.append($createEmptyLineParagraphNode());
    return;
  }

  const childCountBefore = target.getChildrenSize();
  importMarkdownSegment(segment, target);
  for (const child of target.getChildren().slice(childCountBefore)) {
    $coerceImportedBlockToEmptyLine(child);
  }
}

function $coerceImportedBlockToEmptyLine(node: LexicalNode): void {
  if ($isEmptyLineParagraphNode(node) || !$isParagraphNode(node)) {
    return;
  }

  if (isEmptyLinePlaceholderMarkdown(node.getTextContent())) {
    node.replace($createEmptyLineParagraphNode());
    return;
  }

  const markdown = normalizeTopLevelBlockMarkdown(
    formatIntraBlockHardLineBreaks(
      $exportElementMarkdown(node, MARKDOWN_TRANSFORMERS)
    )
  );
  if (isEmptyLinePlaceholderMarkdown(markdown)) {
    node.replace($createEmptyLineParagraphNode());
  }
}

// $convertFromMarkdownString clears its target node, so each chunk is
// imported into a temporary container first, then the resulting blocks
// are hoisted out. Leaving blocks nested inside the container paragraph
// breaks element-level markdown shortcuts (they require blocks to be
// direct children of the root) and corrupts markdown export.
function isWhitespaceOnlyChunk(chunk: string): boolean {
  if (isEmptyLinePlaceholderMarkdown(chunk)) {
    return false;
  }

  if (/[\u00A0]|&nbsp;/i.test(chunk)) {
    return false;
  }

  return /^\s*$/.test(chunk);
}

function $importChunk(chunk: string, target: ElementNode): void {
  if (isEmptyLinePlaceholderMarkdown(chunk)) {
    target.append($createEmptyLineParagraphNode());
    return;
  }

  if (isWhitespaceOnlyChunk(chunk)) {
    if (chunk.length === 0) {
      target.append($createParagraphNode());
      return;
    }

    appendEmptyParagraphsFromGap(chunk, target);
    return;
  }

  if (!chunk.includes('\n\n')) {
    $importMarkdownSegmentOrEmptyLine(chunk, target);
    return;
  }

  const parts = $splitImportChunkParts(chunk);
  for (const part of parts) {
    if (part.kind === 'markdown') {
      if (part.text.length > 0) {
        $importMarkdownSegmentOrEmptyLine(part.text, target);
      }
      continue;
    }

    appendEmptyParagraphsFromGap(part.text, target);
  }
}

export function $importMarkdownString(markdown: string): void {
  $addUpdateTag(IMPORT_MARKDOWN_TAG);
  const root = $getRoot();
  root.clear();

  const emptyLineCount = countEmptyLinePlaceholderLines(markdown);
  if (
    emptyLineCount > 0 &&
    markdown
      .split('\n')
      .every(
        (line) => line.length === 0 || isEmptyLinePlaceholderMarkdown(line)
      )
  ) {
    for (let i = 0; i < emptyLineCount; i++) {
      root.append($createEmptyLineParagraphNode());
    }
    return;
  }

  importMixedNestedListMarkdown(
    markdown,
    root,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );
}

export type MarkdownViewSelectionSnapshot = {
  structuredSelection: StructuredSelection;
  localMarkdown: string;
  localTexts: {
    anchor: string | null;
    focus: string | null;
  };
};

export function $captureMarkdownViewSelection(): MarkdownViewSelectionSnapshot | null {
  const structuredSelection = $captureStructuredSelection();
  if (structuredSelection === null) {
    return null;
  }

  return {
    structuredSelection,
    localMarkdown: $exportMarkdownString(),
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
  options?: { preserveSelection?: boolean }
): void {
  const preserveSelection = options?.preserveSelection ?? true;
  const saved = preserveSelection ? $captureMarkdownViewSelection() : null;

  $importMarkdownString(remote);

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
    $isEmptyLineParagraphNode(paragraph) ||
    paragraph.getParent()?.getType() !== 'root'
  ) {
    return false;
  }

  const markdown = $exportTopLevelBlockMarkdown(paragraph);
  const imported = $markdownToNodes(markdown);

  if (imported.length === 0) {
    return false;
  }

  if (imported.length === 1 && $isParagraphNode(imported[0])) {
    imported[0].remove();
    return false;
  }

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

  return true;
}

export function $markdownToNodes(markdown: string): LexicalNode[] {
  $addUpdateTag(IMPORT_MARKDOWN_TAG);
  // Parses markdown into detached block nodes without touching the document.
  // Import must target root so Lexical markdown coalesces soft line breaks
  // (one\ntwo) into a single paragraph; a paragraph holder splits them.
  // $convertFromMarkdownString moves the selection to the start of its
  // target node, so preserve the caller's selection across the conversion.
  const previousSelection = $getSelection()?.clone() ?? null;
  const root = $getRoot();
  const savedChildren = root.getChildren();

  root.clear();
  importMixedNestedListMarkdown(
    markdown,
    root,
    $importChunk,
    INLINE_MARKDOWN_TRANSFORMERS
  );

  const imported = root.getChildren();
  for (const child of imported) {
    child.remove();
  }
  root.append(...savedChildren);

  $setSelection(previousSelection);
  return imported;
}
