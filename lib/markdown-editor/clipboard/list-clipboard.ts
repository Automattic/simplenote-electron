import { $isListItemNode, $isListNode, ListItemNode } from '@lexical/list';
import { $findMatchingParent } from '@lexical/utils';
import {
  $caretFromPoint,
  $comparePointCaretNext,
  $createRangeSelection,
  $isElementNode,
  $isTextNode,
  type LexicalNode,
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
