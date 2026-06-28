import { copyToClipboard } from '@lexical/clipboard';
import {
  $isCodeNode,
  CodeNode,
  type CodeNode as CodeNodeType,
} from '@lexical/code-core';
import {
  $isQuoteNode,
  QuoteNode,
  type QuoteNode as QuoteNodeType,
} from '@lexical/rich-text';
import {
  $isListItemNode,
  $isListNode,
  ListItemNode,
  type ListNode,
} from '@lexical/list';
import {
  $findMatchingParent,
  mergeRegister,
  objectKlassEquals,
} from '@lexical/utils';
import {
  $caretFromPoint,
  $comparePointCaretNext,
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $nodesOfType,
  COMMAND_PRIORITY_HIGH,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type PointType,
  type RangeSelection,
  type TextNode,
} from 'lexical';

function $isWrapperListItem(listItem: ListItemNode): boolean {
  const children = listItem.getChildren();
  return children.length === 1 && $isListNode(children[0]);
}

function $getListItemContentLeaves(listItem: ListItemNode): TextNode[] {
  const leaves: TextNode[] = [];

  for (const child of listItem.getChildren()) {
    if ($isListNode(child)) {
      continue;
    }
    if ($isTextNode(child)) {
      leaves.push(child);
      continue;
    }
    if ($isElementNode(child)) {
      for (const textNode of child.getAllTextNodes()) {
        leaves.push(textNode);
      }
    }
  }

  return leaves;
}

function $pointAtNodeStart(node: LexicalNode): PointType {
  const selection = $createRangeSelection();
  if ($isTextNode(node)) {
    selection.anchor.set(node.getKey(), 0, 'text');
  } else if ($isElementNode(node)) {
    selection.anchor.set(node.getKey(), 0, 'element');
  } else {
    selection.anchor.set(node.getKey(), 0, 'text');
  }
  return selection.anchor;
}

function $pointAtNodeEnd(node: LexicalNode): PointType {
  const selection = $createRangeSelection();
  if ($isTextNode(node)) {
    selection.anchor.set(node.getKey(), node.getTextContentSize(), 'text');
  } else if ($isElementNode(node)) {
    selection.anchor.set(node.getKey(), node.getChildrenSize(), 'element');
  } else {
    selection.anchor.set(node.getKey(), 0, 'text');
  }
  return selection.anchor;
}

function $pointCoversNodeStart(
  point: PointType,
  node: LexicalNode,
  offset = 0
): boolean {
  if (point.key === node.getKey()) {
    return point.offset <= offset;
  }
  const pointCaret = $caretFromPoint(point, 'next');
  const nodeStartCaret = $caretFromPoint($pointAtNodeStart(node), 'next');
  return $comparePointCaretNext(pointCaret, nodeStartCaret) <= 0;
}

function $pointCoversNodeEnd(point: PointType, node: LexicalNode): boolean {
  if (point.key === node.getKey()) {
    if ($isTextNode(node)) {
      return point.offset >= node.getTextContentSize();
    }
    if ($isElementNode(node)) {
      return point.offset >= node.getChildrenSize();
    }
    return true;
  }
  const pointCaret = $caretFromPoint(point, 'next');
  const nodeEndCaret = $caretFromPoint($pointAtNodeEnd(node), 'next');
  return $comparePointCaretNext(pointCaret, nodeEndCaret) >= 0;
}

function $isListItemContentFullySelected(
  listItem: ListItemNode,
  selection: RangeSelection
): boolean {
  if ($isWrapperListItem(listItem)) {
    return false;
  }

  const leaves = $getListItemContentLeaves(listItem);
  if (leaves.length === 0) {
    return false;
  }

  const [selStart, selEnd] = selection.getStartEndPoints();
  const firstLeaf = leaves[0];
  const lastLeaf = leaves[leaves.length - 1];

  if (
    !$pointCoversNodeStart(selStart, firstLeaf, 0) ||
    !$pointCoversNodeEnd(selEnd, lastLeaf)
  ) {
    return false;
  }

  const selectedKeys = new Set(
    selection.getNodes().map((node) => node.getKey())
  );
  return leaves.every((leaf) => selectedKeys.has(leaf.getKey()));
}

export function $shouldAppendTrailingLinebreakToClipboardMarkdown(
  selection: RangeSelection
): boolean {
  if (selection.isCollapsed()) {
    return false;
  }

  const completeItems = $collectFullySelectedListItems(selection);
  if (completeItems.length === 0) {
    return false;
  }

  const completeItemKeys = new Set(completeItems.map((item) => item.getKey()));

  for (const node of selection.getNodes()) {
    const listItem = $findMatchingParent(node, $isListItemNode);
    if (listItem === null || $isWrapperListItem(listItem)) {
      return false;
    }
    if (!completeItemKeys.has(listItem.getKey())) {
      return false;
    }
  }

  return true;
}

export function $collectFullySelectedListItems(
  selection: RangeSelection
): ListItemNode[] {
  const items = new Map<string, ListItemNode>();

  for (const node of selection.getNodes()) {
    const listItem = $findMatchingParent(node, $isListItemNode);
    if (
      listItem === null ||
      $isWrapperListItem(listItem) ||
      items.has(listItem.getKey())
    ) {
      continue;
    }
    if ($isListItemContentFullySelected(listItem, selection)) {
      items.set(listItem.getKey(), listItem);
    }
  }

  return [...items.values()];
}

function $selectionIsFullyContainedInFullySelectedListItems(
  selection: RangeSelection
): boolean {
  const items = $collectFullySelectedListItems(selection);
  if (items.length === 0) {
    return false;
  }

  const itemKeys = new Set(items.map((item) => item.getKey()));
  for (const node of selection.getNodes()) {
    const listItem = $findMatchingParent(node, $isListItemNode);
    if (
      listItem === null ||
      $isWrapperListItem(listItem) ||
      !itemKeys.has(listItem.getKey())
    ) {
      return false;
    }
  }

  return true;
}

function $isCodeBlockContentFullySelected(
  codeNode: CodeNodeType,
  selection: RangeSelection
): boolean {
  const leaves = codeNode.getAllTextNodes();
  if (leaves.length === 0) {
    const [selStart, selEnd] = selection.getStartEndPoints();
    return (
      $pointCoversNodeStart(selStart, codeNode, 0) &&
      $pointCoversNodeEnd(selEnd, codeNode)
    );
  }

  const [selStart, selEnd] = selection.getStartEndPoints();
  const firstLeaf = leaves[0];
  const lastLeaf = leaves[leaves.length - 1];

  if (
    !$pointCoversNodeStart(selStart, firstLeaf, 0) ||
    !$pointCoversNodeEnd(selEnd, lastLeaf)
  ) {
    return false;
  }

  const selectedKeys = new Set(
    selection.getNodes().map((node) => node.getKey())
  );
  return leaves.every((leaf) => selectedKeys.has(leaf.getKey()));
}

export function $collectFullySelectedCodeBlocks(
  selection: RangeSelection
): CodeNodeType[] {
  const blocks = new Map<string, CodeNodeType>();

  for (const node of selection.getNodes()) {
    const codeNode = $findMatchingParent(node, $isCodeNode);
    if (codeNode === null || blocks.has(codeNode.getKey())) {
      continue;
    }
    if ($isCodeBlockContentFullySelected(codeNode, selection)) {
      blocks.set(codeNode.getKey(), codeNode);
    }
  }

  return [...blocks.values()];
}

function $selectionIsFullyContainedInFullySelectedCodeBlocks(
  selection: RangeSelection
): boolean {
  const blocks = $collectFullySelectedCodeBlocks(selection);
  if (blocks.length === 0) {
    return false;
  }

  const blockKeys = new Set(blocks.map((block) => block.getKey()));
  for (const node of selection.getNodes()) {
    const codeNode = $findMatchingParent(node, $isCodeNode);
    if (codeNode === null || !blockKeys.has(codeNode.getKey())) {
      return false;
    }
  }

  return true;
}

export function $removeFullySelectedCodeBlocks(
  selection: RangeSelection
): boolean {
  if (selection.isCollapsed()) {
    return false;
  }

  const blocks = $collectFullySelectedCodeBlocks(selection);
  if (blocks.length === 0) {
    return false;
  }

  const positions = new Map(
    $nodesOfType(CodeNode).map((block, index) => [block.getKey(), index])
  );
  const sortedBlocks = [...blocks].sort(
    (left, right) =>
      (positions.get(right.getKey()) ?? 0) - (positions.get(left.getKey()) ?? 0)
  );
  const firstRemoved = sortedBlocks[sortedBlocks.length - 1];
  const previousSibling = firstRemoved.getPreviousSibling();

  for (const block of sortedBlocks) {
    block.remove();
  }

  if (previousSibling !== null && $isElementNode(previousSibling)) {
    previousSibling.selectEnd();
  } else {
    $getRoot().selectStart();
  }

  return true;
}

function $tryRemoveFullySelectedCodeBlocks(): boolean {
  const selection = $getSelection();
  if (
    !$isRangeSelection(selection) ||
    !$selectionIsFullyContainedInFullySelectedCodeBlocks(selection)
  ) {
    return false;
  }

  return $removeFullySelectedCodeBlocks(selection);
}

function $isQuoteContentFullySelected(
  quoteNode: QuoteNodeType,
  selection: RangeSelection
): boolean {
  const leaves = quoteNode.getAllTextNodes();
  if (leaves.length === 0) {
    const [selStart, selEnd] = selection.getStartEndPoints();
    return (
      $pointCoversNodeStart(selStart, quoteNode, 0) &&
      $pointCoversNodeEnd(selEnd, quoteNode)
    );
  }

  const [selStart, selEnd] = selection.getStartEndPoints();
  const firstLeaf = leaves[0];
  const lastLeaf = leaves[leaves.length - 1];

  if (
    !$pointCoversNodeStart(selStart, firstLeaf, 0) ||
    !$pointCoversNodeEnd(selEnd, lastLeaf)
  ) {
    return false;
  }

  const selectedKeys = new Set(
    selection.getNodes().map((node) => node.getKey())
  );
  return leaves.every((leaf) => selectedKeys.has(leaf.getKey()));
}

export function $collectFullySelectedBlockquotes(
  selection: RangeSelection
): QuoteNodeType[] {
  const quotes = new Map<string, QuoteNodeType>();

  for (const node of selection.getNodes()) {
    const quoteNode = $findMatchingParent(node, $isQuoteNode);
    if (quoteNode === null || quotes.has(quoteNode.getKey())) {
      continue;
    }
    if ($isQuoteContentFullySelected(quoteNode, selection)) {
      quotes.set(quoteNode.getKey(), quoteNode);
    }
  }

  return [...quotes.values()];
}

function $selectionIsFullyContainedInFullySelectedBlockquotes(
  selection: RangeSelection
): boolean {
  const quotes = $collectFullySelectedBlockquotes(selection);
  if (quotes.length === 0) {
    return false;
  }

  const quoteKeys = new Set(quotes.map((quote) => quote.getKey()));
  for (const node of selection.getNodes()) {
    const quoteNode = $findMatchingParent(node, $isQuoteNode);
    if (quoteNode === null || !quoteKeys.has(quoteNode.getKey())) {
      return false;
    }
  }

  return true;
}

export function $removeFullySelectedBlockquotes(
  selection: RangeSelection
): boolean {
  if (selection.isCollapsed()) {
    return false;
  }

  const quotes = $collectFullySelectedBlockquotes(selection);
  if (quotes.length === 0) {
    return false;
  }

  const positions = new Map(
    $nodesOfType(QuoteNode).map((quote, index) => [quote.getKey(), index])
  );
  const sortedQuotes = [...quotes].sort(
    (left, right) =>
      (positions.get(right.getKey()) ?? 0) - (positions.get(left.getKey()) ?? 0)
  );
  const firstRemoved = sortedQuotes[sortedQuotes.length - 1];
  const previousSibling = firstRemoved.getPreviousSibling();

  for (const quote of sortedQuotes) {
    quote.remove();
  }

  if (previousSibling !== null && $isElementNode(previousSibling)) {
    previousSibling.selectEnd();
  } else {
    $getRoot().selectStart();
  }

  return true;
}

function $tryRemoveFullySelectedBlockquotes(): boolean {
  const selection = $getSelection();
  if (
    !$isRangeSelection(selection) ||
    !$selectionIsFullyContainedInFullySelectedBlockquotes(selection)
  ) {
    return false;
  }

  return $removeFullySelectedBlockquotes(selection);
}

function $removeListItemWithSublist(listItem: ListItemNode): void {
  listItem.remove();
}

function $listItemHasContent(listItem: ListItemNode): boolean {
  if ($isWrapperListItem(listItem)) {
    const nested = listItem.getFirstChild();
    if ($isListNode(nested)) {
      return nested.getChildren().some((child) => {
        return $isListItemNode(child) && $listItemHasContent(child);
      });
    }
    return false;
  }

  return $getListItemContentLeaves(listItem).some(
    (leaf) => leaf.getTextContent().length > 0
  );
}

function $isListEffectivelyEmpty(list: ListNode): boolean {
  return !list.getChildren().some((child) => {
    return $isListItemNode(child) && $listItemHasContent(child);
  });
}

function $removeEmptyListChain(list: ListNode): ParagraphNode | null {
  let current: ListNode | null = list;
  let replacementParagraph: ParagraphNode | null = null;

  while (
    current !== null &&
    current.isAttached() &&
    $isListEffectivelyEmpty(current)
  ) {
    const parentItem = current.getParent();
    const parentList: ListNode | null =
      $isListItemNode(parentItem) && $isListNode(parentItem.getParent())
        ? parentItem.getParent()
        : null;
    const isTopLevel = $isRootNode(current.getParent());

    if (isTopLevel && replacementParagraph === null) {
      replacementParagraph = $createParagraphNode();
      current.insertBefore(replacementParagraph);
    }

    current.remove();

    if (
      $isListItemNode(parentItem) &&
      parentItem.isAttached() &&
      $isWrapperListItem(parentItem) &&
      !$listItemHasContent(parentItem)
    ) {
      parentItem.remove();
      current = parentList;
      continue;
    }

    break;
  }

  if (replacementParagraph === null && $getRoot().getChildrenSize() === 0) {
    replacementParagraph = $createParagraphNode();
    $getRoot().append(replacementParagraph);
  }

  return replacementParagraph;
}

function $findNextContentListItem(listItem: ListItemNode): ListItemNode | null {
  let sibling: LexicalNode | null = listItem.getNextSibling();

  while ($isListItemNode(sibling)) {
    if (!$isWrapperListItem(sibling)) {
      return sibling;
    }
    sibling = sibling.getNextSibling();
  }

  return null;
}

function $findPreviousContentListItem(
  listItem: ListItemNode
): ListItemNode | null {
  let sibling: LexicalNode | null = listItem.getPreviousSibling();

  while ($isListItemNode(sibling)) {
    if (!$isWrapperListItem(sibling)) {
      return sibling;
    }
    sibling = sibling.getPreviousSibling();
  }

  return null;
}

type RemovalSelectionAnchor = {
  nextItem: ListItemNode | null;
  previousItem: ListItemNode | null;
  parentList: ListNode | null;
};

function $captureRemovalSelectionAnchor(
  firstRemoved: ListItemNode,
  lastRemoved: ListItemNode
): RemovalSelectionAnchor {
  return {
    nextItem: $findNextContentListItem(lastRemoved),
    parentList: $isListNode(firstRemoved.getParent())
      ? firstRemoved.getParent()
      : null,
    previousItem: $findPreviousContentListItem(firstRemoved),
  };
}

function $restoreSelectionAfterRemoval(
  anchor: RemovalSelectionAnchor,
  replacementParagraph: ParagraphNode | null
): void {
  if (anchor.nextItem !== null && anchor.nextItem.isAttached()) {
    anchor.nextItem.selectStart();
    return;
  }

  if (anchor.previousItem !== null && anchor.previousItem.isAttached()) {
    anchor.previousItem.selectEnd();
    return;
  }

  if (replacementParagraph !== null && replacementParagraph.isAttached()) {
    replacementParagraph.selectStart();
    return;
  }

  $getRoot().selectStart();
}

function $sortListItemsForRemoval(items: ListItemNode[]): ListItemNode[] {
  const positions = new Map(
    $nodesOfType(ListItemNode).map((item, index) => [item.getKey(), index])
  );

  return [...items].sort(
    (left, right) =>
      (positions.get(right.getKey()) ?? 0) - (positions.get(left.getKey()) ?? 0)
  );
}

export function $removeFullySelectedListItems(
  selection: RangeSelection
): boolean {
  if (selection.isCollapsed()) {
    return false;
  }

  const items = $collectFullySelectedListItems(selection);
  if (items.length === 0) {
    return false;
  }

  const sortedItems = $sortListItemsForRemoval(items);
  const firstRemoved = sortedItems[sortedItems.length - 1];
  const lastRemoved = sortedItems[0];
  const selectionAnchor = $captureRemovalSelectionAnchor(
    firstRemoved,
    lastRemoved
  );
  const listsToPrune = new Set<ListNode>();
  let replacementParagraph: ParagraphNode | null = null;

  for (const item of sortedItems) {
    const parent = item.getParent();
    if ($isListNode(parent)) {
      listsToPrune.add(parent);
    }
    $removeListItemWithSublist(item);
  }

  for (const list of listsToPrune) {
    if (list.isAttached() && $isListEffectivelyEmpty(list)) {
      const paragraph = $removeEmptyListChain(list);
      if (paragraph !== null) {
        replacementParagraph = paragraph;
      }
    }
  }

  if ($getRoot().getChildrenSize() === 0) {
    replacementParagraph = $createParagraphNode();
    $getRoot().append(replacementParagraph);
  }

  $restoreSelectionAfterRemoval(selectionAnchor, replacementParagraph);
  return true;
}

function $tryRemoveFullySelectedListItems(): boolean {
  const selection = $getSelection();
  if (
    !$isRangeSelection(selection) ||
    !$selectionIsFullyContainedInFullySelectedListItems(selection)
  ) {
    return false;
  }
  return $removeFullySelectedListItems(selection);
}

export function registerListDeletion(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () =>
        $tryRemoveFullySelectedListItems() ||
        $tryRemoveFullySelectedCodeBlocks() ||
        $tryRemoveFullySelectedBlockquotes(),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      DELETE_LINE_COMMAND,
      () =>
        $tryRemoveFullySelectedListItems() ||
        $tryRemoveFullySelectedCodeBlocks() ||
        $tryRemoveFullySelectedBlockquotes(),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      CUT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) {
          return false;
        }

        const items = $collectFullySelectedListItems(selection);
        const codeBlocks = $collectFullySelectedCodeBlocks(selection);
        const blockquotes = $collectFullySelectedBlockquotes(selection);
        const canRemoveListItems =
          items.length > 0 &&
          $selectionIsFullyContainedInFullySelectedListItems(selection);
        const canRemoveCodeBlocks =
          codeBlocks.length > 0 &&
          $selectionIsFullyContainedInFullySelectedCodeBlocks(selection);
        const canRemoveBlockquotes =
          blockquotes.length > 0 &&
          $selectionIsFullyContainedInFullySelectedBlockquotes(selection);
        if (
          !canRemoveListItems &&
          !canRemoveCodeBlocks &&
          !canRemoveBlockquotes
        ) {
          return false;
        }

        // Use Lexical's clipboard helper (DataTransfer.setData) rather than
        // navigator.clipboard.write, which rejects custom MIME types such as
        // application/x-lexical-editor.
        void copyToClipboard(
          editor,
          objectKlassEquals(event, ClipboardEvent) ? event : null
        ).then((copied) => {
          if (copied) {
            editor.update(() => {
              if (canRemoveListItems) {
                $tryRemoveFullySelectedListItems();
                return;
              }
              if (canRemoveCodeBlocks) {
                $tryRemoveFullySelectedCodeBlocks();
                return;
              }
              $tryRemoveFullySelectedBlockquotes();
            });
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    )
  );
}
