import {
  $insertDataTransferForRichText,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import { $isCodeNode } from '@lexical/code-core';
import { $toggleLink } from '@lexical/link';
import { $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';
import { $convertFromMarkdownString } from '@lexical/markdown';
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
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type PasteCommandType,
  type RangeSelection,
  type TextNode,
} from 'lexical';

import { $markdownToNodes } from '../import-export';
import { normalizeLinkHref, urlFromText } from '../link-validator';
import { getTableCellInlineTransformers } from '../gfm-transformers';
import { $isSelectionInTable } from '../table-controls';
import { isFormattingFreeHtml } from '../../utils/clipboard/html-to-markdown';
import {
  $getClipboardMarkdownFromDataTransfer,
  $parseSameEditorClipboardJson,
  $shouldPreferMarkdownPasteOverLexicalJson,
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

function $wrapSelectionInPastedLink(markdown: string): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.isCollapsed()) {
    return false;
  }

  const href = normalizeLinkHref(urlFromText(markdown) ?? markdown.trim());
  if (!href) {
    return false;
  }

  $toggleLink(href);
  return true;
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
