import {
  ClipboardImportExtension,
  GetClipboardDataExtension,
  $generateNodesFromSerializedNodes,
  $insertDataTransferForRichText,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import {
  $isCodeNode,
  CodeExtension,
  CodeIndentExtension,
} from '@lexical/code-core';
import {
  HorizontalRuleExtension,
  InitialStateExtension,
} from '@lexical/extension';
import { HistoryExtension } from '@lexical/history';
import { LinkExtension } from '@lexical/link';
import {
  CheckListExtension,
  ListExtension,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
} from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';
import {
  $convertFromMarkdownString,
  $convertSelectionToMarkdownString,
  $convertToMarkdownString,
  HEADING,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  QUOTE,
  STRIKETHROUGH,
  type TextFormatTransformer,
  type TextMatchTransformer,
  type Transformer,
} from '@lexical/markdown';
import { RichTextExtension, $isQuoteNode } from '@lexical/rich-text';
import { TableExtension } from '@lexical/table';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type ParagraphNode,
  type TextNode,
  $getEditor,
  COMMAND_PRIORITY_HIGH,
  configExtension,
  defineExtension,
  PASTE_COMMAND,
  type AnyLexicalExtensionArgument,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type PasteCommandType,
  type RangeSelection,
} from 'lexical';

import { registerFormatEscape } from './format-escape';
import { registerSafeMarkdownShortcuts } from './register-safe-markdown-shortcuts';
import { MarkdownToolbarExtension } from './toolbar-extension';
import {
  parseNamespacedLexicalClipboardJson,
  stripLexicalClipboardJsonPrefix,
  wrapLexicalClipboardJsonPrefix,
} from './clipboard-lexical-json';
import {
  HR,
  IMAGE,
  SELECTION_AWARE_CODE,
  TABLE,
  TILDE_CODE,
  getTableCellInlineTransformers,
} from './gfm-transformers';
import { withTableSafeBlockShortcuts } from './markdown-table-shortcuts';
import { ImageNode } from './image-node';
import {
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_ORDERED_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  importMixedNestedListMarkdown,
  registerTaskListItemShortcuts,
} from './list-transformers';
import {
  $shouldAppendTrailingLinebreakToClipboardMarkdown,
  registerListDeletion,
} from './list-deletion';
import { registerTaskListShortcut } from './list-toggle';
import { registerMarkdownTabIndentation } from './tab-indentation';
import { TableControlsExtension, $isSelectionInTable } from './table-controls';
import {
  isFormattingFreeHtml,
  resolveClipboardPaste,
} from '../utils/clipboard/html-to-markdown';

const ImageExtension = defineExtension({
  name: '@simplenote/image-node',
  nodes: [ImageNode],
});

// CHECK_LIST must precede UNORDERED_LIST so `- [ ]` is parsed as a task item.
// HR before lists (`---` ambiguity). TABLE before CODE (multiline blocks).
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  QUOTE,
  HR,
  MIXED_NESTED_CHECK_LIST,
  MIXED_NESTED_UNORDERED_LIST,
  MIXED_NESTED_ORDERED_LIST,
  TABLE,
  SELECTION_AWARE_CODE,
  TILDE_CODE,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  HIGHLIGHT,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  IMAGE,
  LINK,
];

export const TRANSFORMERS = MARKDOWN_TRANSFORMERS;

const INLINE_MARKDOWN_TRANSFORMERS = MARKDOWN_TRANSFORMERS.filter(
  (transformer): transformer is TextFormatTransformer | TextMatchTransformer =>
    transformer.type === 'text-format' || transformer.type === 'text-match'
);

// Import with Lexical's default merge/strip behavior, then re-insert empty
// paragraphs that standard \n\n export cannot distinguish from block breaks.
function extraEmptyParagraphsInGap(gap: string): number {
  const newlineCount = (gap.match(/\n/g) || []).length;
  // \n\n is a standard block delimiter (0 empty paragraphs). Each additional
  // newline beyond that encodes one intentional empty paragraph in export.
  return newlineCount >= 3 ? newlineCount - 1 : 0;
}

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
  const endFenceRegex = new RegExp(`\\n${marker}\\s*(?:\\n|$)`);
  const match = endFenceRegex.exec(chunk.slice(contentStart));
  if (match === null) {
    return null;
  }

  return contentStart + match.index + match[0].length;
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

export function $exportMarkdownString(): string {
  return $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
}

// $convertFromMarkdownString clears its target node, so each chunk is
// imported into a temporary container first, then the resulting blocks
// are hoisted out. Leaving blocks nested inside the container paragraph
// breaks element-level markdown shortcuts (they require blocks to be
// direct children of the root) and corrupts markdown export.
function $importChunk(chunk: string, target: ElementNode): void {
  if (/^\s*$/.test(chunk)) {
    const lineCount = chunk.length === 0 ? 1 : chunk.split('\n').length;
    for (let i = 0; i < lineCount; i++) {
      target.append($createParagraphNode());
    }
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

    for (let j = 0; j < extraEmptyParagraphsInGap(part.text); j++) {
      target.append($createParagraphNode());
    }
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

export { withMixedNestedListTransformers } from './list-transformers';

const listExtension = configExtension(ListExtension, {
  hasStrictIndent: true,
});

// Inline code escapes on Enter and click since there is no other way out of
// it at the end of a line. Arrow-key escape is handled by
// FormatEscapeExtension instead: the built-in `arrow` trigger lets the caret
// move anyway, which discards the escaped format everywhere except the end
// of the document. Merges with the defaults (capitalize/lowercase/uppercase
// escape on enter/space/tab).
const richTextExtension = configExtension(RichTextExtension, {
  escapeFormatTriggers: {
    code: { onlyAtBoundary: true, enter: true, click: true },
  },
});

// Pressing ArrowLeft/ArrowRight at the edge of formatted text clears that
// format from the selection without moving the caret, so typing continues
// unformatted ("trailing edge escape").
const FormatEscapeExtension = defineExtension({
  name: '@simplenote/format-escape',
  register(editor) {
    return registerFormatEscape(editor);
  },
});

const ListDeletionExtension = defineExtension({
  name: '@simplenote/list-deletion',
  register(editor) {
    return registerListDeletion(editor);
  },
});

const markdownEditorTheme = {
  code: 'lexical-md-editor__code-block',
  hr: 'lexical-md-editor__hr',
  link: 'lexical-md-editor__link',
  list: {
    listitemChecked: 'task-list-item',
    listitemUnchecked: 'task-list-item',
    nested: {
      listitem: 'lexical-nested-list-item',
    },
  },
  table: 'lexical-md-editor__table',
  tableCell: 'lexical-md-editor__table-cell',
  tableCellHeader: 'lexical-md-editor__table-cell-header',
  tableRow: 'lexical-md-editor__table-row',
  tableScrollableWrapper: 'lexical-md-editor__table-scrollable-wrapper',
  text: {
    bold: 'md-bold',
    italic: 'md-italic',
    strikethrough: 'md-strikethrough',
  },
};

export const MarkdownShortcutExtension = defineExtension({
  name: '@simplenote/markdown-shortcuts',
  register(editor) {
    const unregisterMarkdownShortcuts = registerSafeMarkdownShortcuts(
      editor,
      withTableSafeBlockShortcuts(MARKDOWN_TRANSFORMERS)
    );
    const unregisterTaskListItemShortcuts =
      registerTaskListItemShortcuts(editor);
    const unregisterTaskListShortcut = registerTaskListShortcut(editor);
    const unregisterTabIndentation = registerMarkdownTabIndentation(editor);
    return () => {
      unregisterMarkdownShortcuts();
      unregisterTaskListItemShortcuts();
      unregisterTaskListShortcut();
      unregisterTabIndentation();
    };
  },
});

// Cut/copy of one full list line ends with a linebreak; prefer markdown paste
// over Lexical JSON so the item is reinserted as its own bullet, not merged.
const SINGLE_COMPLETE_LIST_LINE =
  /^\s{0,3}(?:[-*+]\s(?:\[[ xX]\]\s)?|\d+\.\s).+\n$/;

// Full code-block copies put fences in text/markdown but Lexical JSON only
// carries the inner text nodes. Prefer markdown paste so the block is restored.
const COMPLETE_FENCED_CODE_BLOCK =
  /^(`{3,}|~{3,})([^\n]*)\n[\s\S]*?\n\1(?:\n|$)/;

export function $shouldPreferMarkdownPasteOverLexicalJson(
  markdown: string
): boolean {
  return (
    SINGLE_COMPLETE_LIST_LINE.test(markdown) ||
    COMPLETE_FENCED_CODE_BLOCK.test(markdown)
  );
}

export const MARKDOWN_CLIPBOARD_MIME_TYPE = 'text/markdown';

export type ClipboardMarkdownSource =
  | 'text/markdown'
  | 'text/html'
  | 'text/plain';

export type ClipboardMarkdownPayload = {
  markdown: string;
  source: ClipboardMarkdownSource;
};

export function $getClipboardMarkdownFromDataTransfer(
  clipboardData: Pick<DataTransfer, 'getData'>
): ClipboardMarkdownPayload | null {
  const markdownMime = clipboardData.getData(MARKDOWN_CLIPBOARD_MIME_TYPE);
  if (markdownMime) {
    return { markdown: markdownMime, source: 'text/markdown' };
  }

  const html = clipboardData.getData('text/html');
  const plain = clipboardData.getData('text/plain');

  if (html) {
    const fromHtml = resolveClipboardPaste({ html, plain });
    if (fromHtml) {
      return { markdown: fromHtml, source: 'text/html' };
    }
  }

  if (plain) {
    return { markdown: plain, source: 'text/plain' };
  }

  return null;
}

function $isNestedListWrapperItem(listItem: ListItemNode): boolean {
  const children = listItem.getChildren();
  return children.length === 1 && $isListNode(children[0]);
}

function $getListItemTrailingTextNode(listItem: ListItemNode): TextNode | null {
  let trailingText: TextNode | null = null;

  for (const child of listItem.getChildren()) {
    if ($isListNode(child)) {
      continue;
    }
    if ($isTextNode(child)) {
      trailingText = child;
      continue;
    }
    if ($isElementNode(child)) {
      for (const textNode of child.getAllTextNodes()) {
        trailingText = textNode;
      }
    }
  }

  return trailingText;
}

// Lexical's ElementNode.selectEnd() advances to the next sibling; for list
// items that lands on the following bullet instead of the pasted line's end.
function $selectEndOfListItemContent(listItem: ListItemNode): void {
  const trailingText = $getListItemTrailingTextNode(listItem);
  if (trailingText !== null) {
    const offset = trailingText.getTextContentSize();
    trailingText.select(offset, offset);
    return;
  }

  listItem.select(0, 0);
}

function $isCollapsedAtListItemStart(
  listItem: ListItemNode,
  selection: ReturnType<typeof $getSelection>
): boolean {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const anchor = selection.anchor;
  if (anchor.offset !== 0) {
    return false;
  }

  const firstDescendant = listItem.getFirstDescendant();
  return (
    anchor.getNode().is(listItem) ||
    (firstDescendant !== null && anchor.getNode().is(firstDescendant))
  );
}

function $insertBlockNodesBefore(
  anchorBlock: ElementNode,
  nodes: LexicalNode[],
  { removeAnchorBlock = false }: { removeAnchorBlock?: boolean } = {}
): void {
  for (const node of nodes) {
    anchorBlock.insertBefore(node);
  }
  if (removeAnchorBlock) {
    anchorBlock.remove();
  }
  nodes[nodes.length - 1].selectEnd();
}

function $shouldReplaceEmptyParagraphWithPaste(
  block: ParagraphNode,
  nodes: LexicalNode[]
): boolean {
  return block.isEmpty() && (nodes.length !== 1 || !$isParagraphNode(nodes[0]));
}

export function $insertMarkdownPasteNodes(
  text: string,
  pasteAnchorBlock: ElementNode | null
): boolean {
  const nodes = $markdownToNodes(text);
  if (nodes.length === 0) {
    return false;
  }

  const insertionSelection = $getSelection();
  if (!$isRangeSelection(insertionSelection)) {
    return false;
  }

  if (nodes.length === 1 && $isParagraphNode(nodes[0])) {
    insertionSelection.insertNodes(nodes[0].getChildren());
    return true;
  }

  const anchor = insertionSelection.anchor;
  const resolvedAnchorBlock =
    $getNodeByKey(pasteAnchorBlock?.getKey() ?? '') ??
    anchor.getNode().getTopLevelElement();
  const anchorBlock = $isElementNode(resolvedAnchorBlock)
    ? resolvedAnchorBlock
    : null;

  const listItem = $findMatchingParent(anchor.getNode(), $isListItemNode);
  if (
    listItem !== null &&
    !$isNestedListWrapperItem(listItem) &&
    nodes.length === 1 &&
    $isListNode(nodes[0]) &&
    $isCollapsedAtListItemStart(listItem, insertionSelection)
  ) {
    const pastedList = nodes[0];
    const pastedItems = pastedList.getChildren();
    for (const item of pastedItems) {
      listItem.insertBefore(item);
    }
    pastedList.remove();
    const lastItem = pastedItems[pastedItems.length - 1];
    if (lastItem !== undefined && $isListItemNode(lastItem)) {
      $selectEndOfListItemContent(lastItem);
    }
    return true;
  }

  if (
    $isParagraphNode(anchorBlock) &&
    $shouldReplaceEmptyParagraphWithPaste(anchorBlock, nodes)
  ) {
    $insertBlockNodesBefore(anchorBlock, nodes, { removeAnchorBlock: true });
    return true;
  }

  const atBlockStart =
    insertionSelection.isCollapsed() &&
    anchor.offset === 0 &&
    $isElementNode(anchorBlock) &&
    (anchor.getNode().is(anchorBlock) ||
      anchor.getNode().is(anchorBlock.getFirstDescendant()));
  if (atBlockStart && !anchorBlock.isEmpty()) {
    $insertBlockNodesBefore(anchorBlock, nodes);
    return true;
  }

  if (
    !$isParagraphNode(nodes[0]) &&
    $isElementNode(anchorBlock) &&
    !anchorBlock.isEmpty()
  ) {
    insertionSelection.insertParagraph();
    const splitSelection = $getSelection();
    const secondHalf = $isRangeSelection(splitSelection)
      ? splitSelection.anchor.getNode().getTopLevelElement()
      : null;
    if (secondHalf !== null) {
      $insertBlockNodesBefore(secondHalf, nodes, {
        removeAnchorBlock: $isParagraphNode(secondHalf) && secondHalf.isEmpty(),
      });
      return true;
    }
  }

  insertionSelection.insertNodes(nodes);
  return true;
}

function $insertInlineMarkdownPasteInTable(text: string): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  $convertFromMarkdownString(text, getTableCellInlineTransformers(), paragraph);
  const children = paragraph.getChildren();
  if (children.length === 0) {
    return false;
  }

  selection.insertNodes(children);
  return true;
}

// Inserts text at the selection, turning newlines into real line breaks instead
// of paragraph splits. Keeps multi-line pastes contained in the current block
// (code block, quote) instead of spilling into sibling paragraphs.
function $insertPlainText(selection: RangeSelection, text: string): void {
  text.split(/\r?\n/).forEach((line, index) => {
    if (index > 0) {
      selection.insertLineBreak();
    }
    if (line !== '') {
      selection.insertText(line);
    }
  });
}

// Plain text and formatting-free HTML (e.g. terminal/browser copies that ship a
// structural-only HTML mirror) carry no formatting worth parsing as markdown.
function $isPlainTextPaste(
  source: ClipboardMarkdownPayload['source'],
  clipboardData: DataTransfer
): boolean {
  if (source === 'text/plain') {
    return true;
  }
  const html = clipboardData.getData('text/html');
  return html !== '' && isFormattingFreeHtml(html);
}

// Editor-internal copies carry lossless Lexical JSON. Returns its nodes, or
// null when the clipboard holds no JSON or it came from a different editor (the
// namespace check mirrors Lexical's own importer). Shared by the paste handler
// and the ClipboardImportExtension importer so the parse rule lives in one spot.
function $parseSameEditorClipboardJson(
  editor: LexicalEditor,
  dataTransfer: DataTransfer
): LexicalNode[] | null {
  const json = dataTransfer.getData('application/x-lexical-editor');
  if (!json) {
    return null;
  }
  const payload = parseNamespacedLexicalClipboardJson(
    json,
    editor._config.namespace
  );
  return payload ? $generateNodesFromSerializedNodes(payload.nodes) : null;
}

function $handleMarkdownPaste(
  editor: LexicalEditor,
  event: PasteCommandType
): boolean {
  const clipboardData = 'clipboardData' in event ? event.clipboardData : null;
  const selection = $getSelection();
  if (!clipboardData || !$isRangeSelection(selection)) {
    return false;
  }
  const anchorNode = selection.anchor.getNode();

  // Code blocks never markdown-parse: insert the raw text verbatim.
  if ($findMatchingParent(anchorNode, $isCodeNode) !== null) {
    const plain = clipboardData.getData('text/plain');
    if (!plain) {
      return false;
    }
    event.preventDefault();
    $insertPlainText(selection, plain);
    return true;
  }

  const clipboardMarkdown =
    $getClipboardMarkdownFromDataTransfer(clipboardData);
  if (!clipboardMarkdown) {
    return false;
  }
  const { markdown, source } = clipboardMarkdown;

  // Plain content keeps its line structure inside a quote instead of escaping
  // into sibling paragraphs.
  if (
    $isPlainTextPaste(source, clipboardData) &&
    $findMatchingParent(anchorNode, $isQuoteNode) !== null
  ) {
    event.preventDefault();
    $insertPlainText(
      selection,
      clipboardData.getData('text/plain') || markdown
    );
    return true;
  }

  // Same-editor copies carry lossless Lexical JSON: insert it verbatim. Some
  // shapes (a single list line, a full fenced code block) are lossy in JSON and
  // are left to markdown paste below.
  if (!$shouldPreferMarkdownPasteOverLexicalJson(markdown)) {
    const sameEditorNodes = $parseSameEditorClipboardJson(
      editor,
      clipboardData
    );
    if (sameEditorNodes) {
      event.preventDefault();
      $insertGeneratedNodes(editor, sameEditorNodes, selection);
      return true;
    }
  }

  // External plain text has no markdown to parse: let Lexical's plain-text
  // importer handle it, run inline so repeated pastes don't get stuck on nested
  // update cycles.
  if (source === 'text/plain') {
    event.preventDefault();
    $insertDataTransferForRichText(clipboardData, selection, editor);
    return true;
  }

  // Everything else is markdown/HTML we parse into nodes ourselves.
  if ($isSelectionInTable()) {
    if (!$insertInlineMarkdownPasteInTable(markdown)) {
      return false;
    }
    event.preventDefault();
    return true;
  }

  const anchorBlock = anchorNode.getTopLevelElement();
  if (!$insertMarkdownPasteNodes(markdown, anchorBlock)) {
    return false;
  }
  event.preventDefault();
  return true;
}

export function registerMarkdownPaste(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    PASTE_COMMAND,
    (event) => $handleMarkdownPaste(editor, event),
    COMMAND_PRIORITY_HIGH
  );
}

export const MarkdownPasteExtension = defineExtension({
  name: '@simplenote/markdown-paste',
  register(editor) {
    return registerMarkdownPaste(editor);
  },
});

const $exportSelectionMarkdown = (
  selection: NonNullable<ReturnType<typeof $getSelection>>
) => {
  let markdown = $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');

  // A trailing linebreak keeps pasted list lines as separate items instead of
  // merging with the following line when cut/copy markdown is reused.
  if (
    $isRangeSelection(selection) &&
    $shouldAppendTrailingLinebreakToClipboardMarkdown(selection) &&
    markdown.length > 0 &&
    !markdown.endsWith('\n')
  ) {
    markdown += '\n';
  }

  return markdown;
};

export const MarkdownCopyExtension = defineExtension({
  name: '@simplenote/markdown-copy',
  dependencies: [
    configExtension(GetClipboardDataExtension, {
      $exportMimeType: {
        [MARKDOWN_CLIPBOARD_MIME_TYPE]: [
          (selection) =>
            selection ? $exportSelectionMarkdown(selection) : null,
        ],
        // Prefix Lexical JSON so Cursor IDE ignores it; stripped on import below.
        'application/x-lexical-editor': [
          (selection, next) => {
            if (!selection) {
              return next();
            }
            const json = next();
            return json ? wrapLexicalClipboardJsonPrefix(json) : null;
          },
        ],
      },
    }),
    configExtension(ClipboardImportExtension, {
      $importMimeType: {
        'application/x-lexical-editor': [
          (_data, selection, $next, dataTransfer) => {
            const clipboardMarkdown =
              $getClipboardMarkdownFromDataTransfer(dataTransfer);
            if (
              clipboardMarkdown &&
              $shouldPreferMarkdownPasteOverLexicalJson(
                clipboardMarkdown.markdown
              )
            ) {
              return false;
            }

            const nodes = $parseSameEditorClipboardJson(
              $getEditor(),
              dataTransfer
            );
            if (!nodes) {
              return $next();
            }

            $insertGeneratedNodes($getEditor(), nodes, selection);
            return true;
          },
        ],
      },
    }),
  ],
});

// Updates applied from remote/store content (as opposed to local typing) carry
// this tag so the on-change serializer doesn't echo them back as edits.
export const REMOTE_CONTENT_TAG = 'simplenote:remote-content';

// Serializing the whole tree to markdown is O(document), which is noticeable
// on very large notes. A debounced implementation exists but is shelved for
// now; see .cursor/debounced-markdown-serialization.md before reintroducing.
export function registerMarkdownOnChange(
  editor: LexicalEditor,
  onChange: (markdown: string) => void
): () => void {
  return editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState, tags }) => {
      if (tags.has(REMOTE_CONTENT_TAG)) {
        return;
      }
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }
      editorState.read(() => {
        const markdown = $exportMarkdownString();
        queueMicrotask(() => onChange(markdown));
      });
    }
  );
}

function createMarkdownOnChangeExtension(onChange: (markdown: string) => void) {
  return defineExtension({
    name: '@simplenote/markdown-on-change',
    register(editor) {
      return registerMarkdownOnChange(editor, onChange);
    },
  });
}

export function createMarkdownEditorExtension(
  markdown: string,
  onChange?: (nextMarkdown: string) => void
) {
  const dependencies: AnyLexicalExtensionArgument[] = [
    configExtension(InitialStateExtension, {
      updateOptions: { tag: REMOTE_CONTENT_TAG },
    }),
    richTextExtension,
    FormatEscapeExtension,
    HistoryExtension,
    listExtension,
    ListDeletionExtension,
    CheckListExtension,
    LinkExtension,
    CodeExtension,
    configExtension(CodeIndentExtension, {
      disabled: true,
      tabSize: undefined,
    }),
    TableExtension,
    TableControlsExtension,
    HorizontalRuleExtension,
    ImageExtension,
    MarkdownShortcutExtension,
    MarkdownPasteExtension,
    MarkdownCopyExtension,
    MarkdownToolbarExtension,
  ];

  if (onChange) {
    dependencies.push(createMarkdownOnChangeExtension(onChange));
  }

  return defineExtension({
    $initialEditorState() {
      $importMarkdownString(markdown);
      // Leave the caret at the start: with no selection, Lexical's focus
      // handling falls back to selectEnd(), which scrolls long notes to the
      // bottom the first time the editor gains focus.
      $getRoot().selectStart();
    },
    dependencies,
    name: '@simplenote/markdown-editor',
    namespace: 'SimplenoteMarkdownEditor',
    onError(error: Error) {
      throw error;
    },
    theme: markdownEditorTheme,
  });
}
