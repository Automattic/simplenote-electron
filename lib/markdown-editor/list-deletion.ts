import { copyToClipboard } from '@lexical/clipboard';
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

function $collectFullySelectedListItems(
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
  if (!$isRangeSelection(selection)) {
    return false;
  }
  return $removeFullySelectedListItems(selection);
}

export function registerListDeletion(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => $tryRemoveFullySelectedListItems(),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      DELETE_LINE_COMMAND,
      () => $tryRemoveFullySelectedListItems(),
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
        if (items.length === 0) {
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
              $tryRemoveFullySelectedListItems();
            });
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    )
  );
}
