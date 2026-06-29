import { $importInlineMarkdown } from '../markdown/lexical-io';
import { getTableCellInlineTransformers } from '../markdown/gfm-transformers';
import { $insertDataTransferForRichText } from '@lexical/clipboard';
import { $isCodeNode } from '@lexical/code-core';
import { $toggleLink } from '@lexical/link';
import { $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';
import { $isQuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  defineExtension,
  PASTE_COMMAND,
  type BaseSelection,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type PasteCommandType,
  type RangeSelection,
  type TextNode,
} from 'lexical';

import { clearBlockExportCache } from '../markdown/block-export-cache';
import { $markdownToNodes } from '../markdown/import-export';
import { normalizeLinkHref, urlFromText } from '../links/link-validator';
import { $isSelectionInTable } from '../extensions/table-controls';
import { isFormattingFreeHtml } from '../../utils/clipboard/html-to-markdown';
import {
  $getClipboardMarkdownFromDataTransfer,
  $shouldPreferMarkdownPasteOverLexicalJson,
  MARKDOWN_CLIPBOARD_MIME_TYPE,
  type ClipboardMarkdownPayload,
} from './shared';

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

  if (
    nodes.length > 1 &&
    $isElementNode(anchorBlock) &&
    $isParagraphNode(anchorBlock) &&
    anchorBlock.isEmpty()
  ) {
    $insertBlockNodesBefore(anchorBlock, nodes, { removeAnchorBlock: true });
    return true;
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
  $importInlineMarkdown(text, paragraph, getTableCellInlineTransformers());
  const children = paragraph.getChildren();
  if (children.length === 0) {
    return false;
  }

  selection.insertNodes(children);
  return true;
}

export function $importMarkdownClipboard(
  markdown: string,
  selection: BaseSelection | null
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  if ($isSelectionInTable()) {
    return $insertInlineMarkdownPasteInTable(markdown);
  }

  const anchorBlock = selection.anchor.getNode().getTopLevelElement();
  return $insertMarkdownPasteNodes(markdown, anchorBlock);
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

function $wrapSelectionInPastedLink(markdown: string): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return false;
  }

  const url = urlFromText(markdown);
  if (!url) {
    return false;
  }

  const href = normalizeLinkHref(url);
  if (!href) {
    return false;
  }

  $toggleLink(href);
  return true;
}

// Copy puts markdown in text/plain only (not text/markdown). When Lexical JSON
// would lose block structure, import the markdown from text/plain before the
// import pipeline tries text/html.
function $tryPasteMarkdownFromPlainTextWhenLexicalJsonPresent(
  clipboardData: DataTransfer,
  selection: BaseSelection
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }
  if (clipboardData.getData(MARKDOWN_CLIPBOARD_MIME_TYPE)) {
    return false;
  }
  const plain = clipboardData.getData('text/plain');
  if (!plain || !clipboardData.getData('application/x-lexical-editor')) {
    return false;
  }
  if (!$shouldPreferMarkdownPasteOverLexicalJson(plain)) {
    return false;
  }
  return $importMarkdownClipboard(plain, selection);
}

// PASTE_COMMAND intercepts edge cases needing command-level control before
// RichTextExtension delegates to the import pipeline; remaining cases go
// through the import pipeline directly so plain-text pastes avoid nested updates.
function $handleMarkdownPasteEdgeCases(event: PasteCommandType): boolean {
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

  if (source === 'text/plain' && $wrapSelectionInPastedLink(markdown)) {
    event.preventDefault();
    return true;
  }

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

  return false;
}

function $handleMarkdownPaste(event: PasteCommandType): boolean {
  if ($handleMarkdownPasteEdgeCases(event)) {
    return true;
  }

  const clipboardData = 'clipboardData' in event ? event.clipboardData : null;
  const selection = $getSelection();
  if (!clipboardData || !$isRangeSelection(selection)) {
    return false;
  }

  if (
    $tryPasteMarkdownFromPlainTextWhenLexicalJsonPresent(
      clipboardData,
      selection
    )
  ) {
    event.preventDefault();
    return true;
  }

  if (!$getClipboardMarkdownFromDataTransfer(clipboardData)) {
    return false;
  }

  event.preventDefault();
  $insertDataTransferForRichText(clipboardData, selection);
  return true;
}

export function registerMarkdownPaste(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    PASTE_COMMAND,
    (event) => {
      clearBlockExportCache(editor);
      return $handleMarkdownPaste(event);
    },
    COMMAND_PRIORITY_HIGH
  );
}

export const MarkdownPasteExtension = defineExtension({
  name: '@simplenote/markdown-paste',
  register(editor) {
    return registerMarkdownPaste(editor);
  },
});
