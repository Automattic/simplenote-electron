import type { ElementNode, LexicalEditor } from 'lexical';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  LexicalNode,
} from 'lexical';
import {
  $createListItemNode,
  $createListNode,
  $insertList,
  $isListItemNode,
  $isListNode,
  $removeList,
  ListItemNode,
  ListNode,
  ListType,
} from '@lexical/list';

export type ActiveListType = 'bulletList' | 'orderedList' | 'taskList';
export type ToolbarListType = ActiveListType;

/** Leading GFM task marker duplicated inside a task item label. */
const EMBEDDED_TASK_MARKER = /^- \[[ xX]\]\s+/;

const stripEmbeddedTaskMarker = (text: string): string =>
  text.replace(EMBEDDED_TASK_MARKER, '');

type SubListInfo = {
  node: ListNode;
  key: string;
};

type SubListSelectionAnchor = {
  itemIndex: number;
  itemKey?: string;
  textOffset: number;
};

const toolbarToListType: Record<ToolbarListType, ListType> = {
  bulletList: 'bullet',
  orderedList: 'number',
  taskList: 'check',
};

const listTypeToToolbar = (listType: ListType): ToolbarListType | null => {
  switch (listType) {
    case 'bullet':
      return 'bulletList';
    case 'number':
      return 'orderedList';
    case 'check':
      return 'taskList';
    default:
      return null;
  }
};

const getSelectionAnchorInList = (list: ListNode): SubListSelectionAnchor => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return { itemIndex: 0, textOffset: 0 };
  }

  const items = list.getChildren().filter($isListItemNode);
  const anchorNode = selection.anchor.getNode();
  const listItem = $findMatchingParent(anchorNode, $isListItemNode);

  if (!listItem || listItem.getParent()?.getKey() !== list.getKey()) {
    return { itemIndex: 0, textOffset: 0 };
  }

  const itemIndex = items.findIndex(
    (item) => item.getKey() === listItem.getKey()
  );

  return {
    itemIndex: Math.max(itemIndex, 0),
    itemKey: listItem.getKey(),
    textOffset: selection.anchor.offset,
  };
};

const selectInListItem = (list: ListNode, anchor: SubListSelectionAnchor) => {
  const items = list.getChildren().filter($isListItemNode);
  const item =
    (anchor.itemKey
      ? items.find((candidate) => candidate.getKey() === anchor.itemKey)
      : null) ??
    items[anchor.itemIndex] ??
    items[0];

  if (!item) {
    return;
  }

  const paragraph = item
    .getChildren()
    .find(
      (child): child is ElementNode =>
        $isElementNode(child) && child.getType() === 'paragraph'
    );
  const textNode = paragraph?.getFirstChild() ?? item.getFirstChild();
  const offset = Math.min(
    anchor.textOffset,
    textNode?.getTextContent().length ?? 0
  );

  if (textNode) {
    const selection = $createRangeSelection();
    selection.anchor.set(textNode.getKey(), offset, 'text');
    selection.focus.set(textNode.getKey(), offset, 'text');
    $setSelection(selection);
    return;
  }

  if (paragraph && $isElementNode(paragraph)) {
    paragraph.selectStart();
    return;
  }

  item.selectStart();
};

const stripTaskMarkerFromParagraph = (node: LexicalNode): LexicalNode => {
  if (node.getType() !== 'paragraph' || !$isElementNode(node)) {
    return node;
  }

  const children = node.getChildren();
  const nextChildren: LexicalNode[] = [];
  let changed = false;

  children.forEach((child) => {
    if (!$isTextNode(child)) {
      nextChildren.push(child);
      return;
    }

    const stripped = stripEmbeddedTaskMarker(child.getTextContent());

    if (stripped !== child.getTextContent()) {
      changed = true;
    }

    if (stripped) {
      nextChildren.push(child.setTextContent(stripped));
    }
  });

  if (!changed) {
    return node;
  }

  const paragraph = $createParagraphNode();
  nextChildren.forEach((child) => paragraph.append(child));
  return paragraph;
};

const listItemContentBlocks = (item: ListItemNode): LexicalNode[] => {
  const blocks: LexicalNode[] = [];

  item.getChildren().forEach((child) => {
    if ($isListNode(child)) {
      return;
    }

    if (child.getType() === 'paragraph') {
      blocks.push(stripTaskMarkerFromParagraph(child));
      return;
    }

    if (child.getType() === 'text') {
      const stripped = stripEmbeddedTaskMarker(child.getTextContent());
      const paragraph = $createParagraphNode();

      if (stripped) {
        paragraph.append($createTextNode(stripped));
      }

      blocks.push(paragraph);
      return;
    }

    blocks.push(child);
  });

  return blocks.length ? blocks : [$createParagraphNode()];
};

const createListItemWithContent = (
  listType: ToolbarListType,
  blocks: LexicalNode[]
): ListItemNode => {
  const item = $createListItemNode();

  if (listType === 'taskList') {
    item.setChecked(false);
  }

  blocks.forEach((block) => item.append(block));
  return item;
};

const convertListNodeType = (
  list: ListNode,
  targetType: ToolbarListType
): ListNode => {
  const nextList = $createListNode(toolbarToListType[targetType]);

  list.getChildren().forEach((child) => {
    if (!$isListItemNode(child)) {
      return;
    }

    nextList.append(
      createListItemWithContent(targetType, listItemContentBlocks(child))
    );
  });

  return nextList;
};

const getSelectedListItemLabel = (): string => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return '';
  }

  const listItem = $findMatchingParent(
    selection.anchor.getNode(),
    $isListItemNode
  );

  return listItem?.getTextContent() ?? '';
};

const selectInListItemByLabel = (list: ListNode, label: string) => {
  const items = list.getChildren().filter($isListItemNode);
  const item =
    items.find((candidate) => candidate.getTextContent() === label) ?? items[0];

  if (!item) {
    return;
  }

  const textNode = item.getFirstChild();

  if (textNode?.getType() === 'text') {
    const selection = $createRangeSelection();
    selection.anchor.set(textNode.getKey(), 0, 'text');
    selection.focus.set(textNode.getKey(), 0, 'text');
    $setSelection(selection);
    return;
  }

  item.selectStart();
};

const replaceListPreservingSelection = (
  info: SubListInfo,
  newList: ListNode
) => {
  const selectedLabel = getSelectedListItemLabel();
  const current = $getNodeByKey(info.key);

  if (!current || !$isListNode(current)) {
    return false;
  }

  current.replace(newList);

  if (selectedLabel) {
    selectInListItemByLabel(newList, selectedLabel);
  } else {
    selectInListItem(newList, getSelectionAnchorInList(newList));
  }

  return true;
};

export const findNestedSubList = (): SubListInfo | null => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  const listNode = $findMatchingParent(selection.anchor.getNode(), $isListNode);

  if (listNode) {
    const parent = listNode.getParent();

    if ($isListItemNode(parent)) {
      return { node: listNode, key: listNode.getKey() };
    }
  }

  const container = $findMatchingParent(
    selection.anchor.getNode(),
    $isListItemNode
  );

  if (!container) {
    return null;
  }

  for (const child of container.getChildren()) {
    if ($isListNode(child)) {
      return { node: child, key: child.getKey() };
    }
  }

  const parentList = container.getParent();

  if (!$isListNode(parentList)) {
    return null;
  }

  const items = parentList.getChildren().filter($isListItemNode);
  const containerIndex = items.findIndex(
    (item) => item.getKey() === container.getKey()
  );

  if (containerIndex === -1) {
    return null;
  }

  for (let index = containerIndex + 1; index < items.length; index += 1) {
    const sibling = items[index];

    for (const child of sibling.getChildren()) {
      if ($isListNode(child)) {
        return { node: child, key: child.getKey() };
      }
    }
  }

  return null;
};

const findInnermostListAtSelection = (): SubListInfo | null => {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  let current: LexicalNode | null = selection.anchor.getNode();
  let innermost: ListNode | null = null;

  while (current) {
    if ($isListNode(current)) {
      innermost = current;
    }

    current = current.getParent();
  }

  return innermost ? { node: innermost, key: innermost.getKey() } : null;
};

const convertSubListType = (
  info: SubListInfo,
  targetType: ToolbarListType
): boolean =>
  replaceListPreservingSelection(
    info,
    convertListNodeType(info.node, targetType)
  );

const unwrapSubList = (info: SubListInfo): boolean => {
  const anchor = getSelectionAnchorInList(info.node);
  const blocks: LexicalNode[] = [];

  info.node.getChildren().forEach((child) => {
    if (!$isListItemNode(child)) {
      return;
    }

    blocks.push(...listItemContentBlocks(child));
  });

  const replacement = blocks.length ? blocks : [$createParagraphNode()];
  const current = $getNodeByKey(info.key);

  if (!current || !$isListNode(current)) {
    return false;
  }

  const listParent = current.getParent();

  if ($isListItemNode(listParent)) {
    const outerList = listParent.getParent();

    if ($isListNode(outerList)) {
      const bulletList = $createListNode('bullet');

      info.node.getChildren().forEach((child) => {
        if (!$isListItemNode(child)) {
          return;
        }

        const item = $createListItemNode();
        const text = stripEmbeddedTaskMarker(child.getTextContent());

        if (text) {
          item.append($createTextNode(text));
        }

        bulletList.append(item);
      });

      listParent.replace(bulletList);
      selectInListItem(bulletList, anchor);
      return true;
    }
  }

  let previous: LexicalNode = current;

  replacement.forEach((block, index) => {
    if (index === 0) {
      current.replace(block);
      previous = block;
      return;
    }

    previous.insertAfter(block);
    previous = block;
  });

  const block = replacement[Math.min(anchor.itemIndex, replacement.length - 1)];

  if ($isElementNode(block)) {
    block.selectStart();
  }

  return true;
};

export const toggleListAtSelection = (
  editor: LexicalEditor,
  listType: ToolbarListType
): boolean => {
  let ran = false;

  editor.update(() => {
    const nested = findNestedSubList();

    if (nested) {
      const nestedType = listTypeToToolbar(nested.node.getListType());

      if (nestedType === listType) {
        ran = unwrapSubList(nested);
        return;
      }

      ran = convertSubListType(nested, listType);
      return;
    }

    const listScope = findInnermostListAtSelection();

    if (listScope) {
      const scopeType = listTypeToToolbar(listScope.node.getListType());

      if (scopeType === listType) {
        $removeList();
        ran = true;
        return;
      }

      ran = convertSubListType(listScope, listType);
      return;
    }

    $insertList(toolbarToListType[listType]);
    ran = true;
  });

  if (ran) {
    editor.focus();
  }

  return ran;
};
