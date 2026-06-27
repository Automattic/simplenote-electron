import {
  $isCodeNode,
  $plainifyCodeContent,
  type CodeNode,
} from '@lexical/code-core';
import { $isListItemNode, $isListNode, ListItemNode } from '@lexical/list';
import { $isTableCellNode } from '@lexical/table';
import { $findMatchingParent } from '@lexical/utils';
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type PointType,
  type RangeSelection,
} from 'lexical';

function $isWrapperListItem(listItem: ListItemNode): boolean {
  const children = listItem.getChildren();
  return children.length === 1 && $isListNode(children[0]);
}

function $getContentListItemAncestor(node: LexicalNode): ListItemNode | null {
  const listItem = $findMatchingParent(node, $isListItemNode);
  if (listItem === null || $isWrapperListItem(listItem)) {
    return null;
  }
  return listItem;
}

function $collectContentListItemsInDocumentOrder(): ListItemNode[] {
  const items: ListItemNode[] = [];

  const walk = (node: LexicalNode): void => {
    if ($isListItemNode(node) && !$isWrapperListItem(node)) {
      items.push(node);
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        walk(child);
      }
    }
  };

  for (const child of $getRoot().getChildren()) {
    walk(child);
  }

  return items;
}

// Any non-collapsed range with anchor/focus in list items collects every
// content item between them, even when the endpoints are only partly selected.
function $collectListItemsInSelectionRange(
  selection: RangeSelection
): ListItemNode[] {
  if (selection.isCollapsed()) {
    return [];
  }

  const anchorItem = $getContentListItemAncestor(selection.anchor.getNode());
  const focusItem = $getContentListItemAncestor(selection.focus.getNode());
  if (anchorItem === null || focusItem === null) {
    return [];
  }

  const allItems = $collectContentListItemsInDocumentOrder();
  const anchorIndex = allItems.indexOf(anchorItem);
  const focusIndex = allItems.indexOf(focusItem);
  if (anchorIndex === -1 || focusIndex === -1) {
    return [];
  }

  const start = Math.min(anchorIndex, focusIndex);
  const end = Math.max(anchorIndex, focusIndex);
  return allItems.slice(start, end + 1);
}

function $sortByDocumentOrder<T extends LexicalNode>(nodes: T[]): T[] {
  const positions = new Map<string, number>();
  let index = 0;

  const walk = (node: LexicalNode): void => {
    positions.set(node.getKey(), index++);
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        walk(child);
      }
    }
  };

  for (const child of $getRoot().getChildren()) {
    walk(child);
  }

  return [...nodes].sort(
    (left, right) =>
      (positions.get(left.getKey()) ?? 0) - (positions.get(right.getKey()) ?? 0)
  );
}

function $restoreSelectionPoints(selStart: PointType, selEnd: PointType): void {
  const newSelection = $createRangeSelection();
  newSelection.anchor.set(selStart.key, selStart.offset, selStart.type);
  newSelection.focus.set(selEnd.key, selEnd.offset, selEnd.type);
  $setSelection(newSelection);
}

// Lexical renders an item's nested sublist as a next-sibling <li> wrapper
// whose only child is the inner list.
function $getNestedSublistWrapper(listItem: ListItemNode): ListItemNode | null {
  const next = listItem.getNextSibling();
  return $isListItemNode(next) && $isListNode(next.getFirstChild())
    ? next
    : null;
}

function $indentListItem(listItem: ListItemNode, outdent: boolean): boolean {
  const indent = listItem.getIndent();
  if (outdent && indent === 0) {
    return false;
  }

  // Move the item's nested sublist along with it so descendants keep their
  // relative depth. Leaving them behind creates a >1 indent jump that the
  // strict-indent list transform repairs with cascading tree surgery, which
  // crashes the DOM reconciler ("DOMSlot.insertChild: before is not in
  // element"). It also matches expected UX: children follow their parent.
  const sublistWrapper = $getNestedSublistWrapper(listItem);
  if (sublistWrapper !== null) {
    sublistWrapper.remove();
  }

  listItem.setIndent(outdent ? indent - 1 : indent + 1);

  if (sublistWrapper !== null) {
    listItem.insertAfter(sublistWrapper);
  }

  return true;
}

function $getCodeNodeFromSelection(selection: RangeSelection): CodeNode | null {
  return $findMatchingParent(selection.anchor.getNode(), $isCodeNode);
}

function $pointToCodeOffset(codeNode: CodeNode, point: PointType): number {
  if (point.key === codeNode.getKey() && point.type === 'element') {
    let offset = 0;
    for (let index = 0; index < point.offset; index++) {
      const child = codeNode.getChildAtIndex(index);
      if (child !== null) {
        offset += child.getTextContent().length;
      }
    }
    return offset;
  }

  let offset = 0;

  for (const child of codeNode.getChildren()) {
    if (child.getKey() === point.key) {
      return offset + point.offset;
    }
    offset += child.getTextContent().length;
  }

  return offset;
}

function $flatOffsetToCodePoint(
  codeNode: CodeNode,
  flatOffset: number
): PointType | null {
  const children = codeNode.getChildren();
  let offset = 0;

  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    const length = child.getTextContent().length;
    const childStart = offset;
    const childEnd = offset + length;
    const isLast = index === children.length - 1;

    if (
      flatOffset >= childStart &&
      (flatOffset < childEnd || (isLast && flatOffset <= childEnd))
    ) {
      const point = $createRangeSelection().anchor;

      if ($isLineBreakNode(child)) {
        const previousChild = index > 0 ? children[index - 1] : null;
        if (
          previousChild !== null &&
          !$isLineBreakNode(previousChild) &&
          flatOffset === childStart
        ) {
          point.set(
            previousChild.getKey(),
            previousChild.getTextContent().length,
            'text'
          );
        } else {
          point.set(codeNode.getKey(), index, 'element');
        }
        return point;
      }

      point.set(
        child.getKey(),
        Math.min(flatOffset - childStart, length),
        'text'
      );
      return point;
    }

    offset = childEnd;
  }

  return null;
}

function $replaceCodeText(codeNode: CodeNode, newText: string): void {
  codeNode.splice(0, codeNode.getChildrenSize(), $plainifyCodeContent(newText));
}

function $setCodeSelectionOffsets(
  codeNode: CodeNode,
  start: number,
  end: number
): void {
  const anchorPoint = $flatOffsetToCodePoint(codeNode, start);
  const focusPoint = $flatOffsetToCodePoint(codeNode, end);
  if (anchorPoint === null || focusPoint === null) {
    return;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(anchorPoint.key, anchorPoint.offset, anchorPoint.type);
  selection.focus.set(focusPoint.key, focusPoint.offset, focusPoint.type);
  $setSelection(selection);
}

function $indentCodeLineRange(
  text: string,
  rangeStart: number,
  rangeEnd: number,
  outdent: boolean
): { newText: string; start: number; end: number } {
  const lineStart = text.lastIndexOf('\n', rangeStart - 1) + 1;
  const lineEnd = text.indexOf('\n', rangeEnd);
  const sliceEnd = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(lineStart, sliceEnd).split('\n');
  const newLines = lines.map((line) => {
    if (outdent) {
      return line.startsWith('\t') ? line.slice(1) : line;
    }
    return `\t${line}`;
  });
  const removedTabs = lines.filter((line) => line.startsWith('\t')).length;
  const offsetDelta = outdent ? -removedTabs : lines.length;
  const newText =
    text.slice(0, lineStart) + newLines.join('\n') + text.slice(sliceEnd);

  return {
    end: rangeEnd + offsetDelta,
    newText,
    start: rangeStart,
  };
}

function $handleCodeBlockTab(
  selection: RangeSelection,
  outdent: boolean,
  event: KeyboardEvent
): boolean {
  const codeNode = $getCodeNodeFromSelection(selection);
  if (codeNode === null) {
    return false;
  }

  const text = codeNode.getTextContent();

  if (!selection.isCollapsed()) {
    const [selStart, selEnd] = selection.getStartEndPoints();
    const rangeStart = Math.min(
      $pointToCodeOffset(codeNode, selStart),
      $pointToCodeOffset(codeNode, selEnd)
    );
    const rangeEnd = Math.max(
      $pointToCodeOffset(codeNode, selStart),
      $pointToCodeOffset(codeNode, selEnd)
    );
    const { newText, start, end } = $indentCodeLineRange(
      text,
      rangeStart,
      rangeEnd,
      outdent
    );

    $replaceCodeText(codeNode, newText);
    $setCodeSelectionOffsets(codeNode, start, end);
    event.preventDefault();
    return true;
  }

  const offset = $pointToCodeOffset(codeNode, selection.anchor);

  if (outdent) {
    if (offset === 0 || text[offset - 1] !== '\t') {
      event.preventDefault();
      return true;
    }
    const newText = text.slice(0, offset - 1) + text.slice(offset);
    $replaceCodeText(codeNode, newText);
    $setCodeSelectionOffsets(codeNode, offset - 1, offset - 1);
    event.preventDefault();
    return true;
  }

  const newText = `${text.slice(0, offset)}\t${text.slice(offset)}`;
  $replaceCodeText(codeNode, newText);
  $setCodeSelectionOffsets(codeNode, offset + 1, offset + 1);
  event.preventDefault();
  return true;
}

export function $handleMarkdownTab(event: KeyboardEvent): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const anchorNode = selection.anchor.getNode();
  const outdent = event.shiftKey;

  if ($findMatchingParent(anchorNode, $isCodeNode) !== null) {
    return $handleCodeBlockTab(selection, outdent, event);
  }

  if ($findMatchingParent(anchorNode, $isTableCellNode) !== null) {
    return false;
  }

  const listItems = $collectListItemsInSelectionRange(selection);

  if (listItems.length > 0) {
    const [selStart, selEnd] = selection.getStartEndPoints();

    for (const item of $sortByDocumentOrder(listItems)) {
      $indentListItem(item, outdent);
    }

    $restoreSelectionPoints(selStart, selEnd);
    event.preventDefault();
    return true;
  }

  const listItem = $getContentListItemAncestor(anchorNode);
  if (listItem !== null && selection.isCollapsed()) {
    if ($indentListItem(listItem, outdent)) {
      event.preventDefault();
      return true;
    }
    // Shift+Tab on a top-level item: nothing to outdent, but still consume
    // the event so focus doesn't escape the editor.
    event.preventDefault();
    return true;
  }

  return false;
}

export function registerMarkdownTabIndentation(
  editor: LexicalEditor
): () => void {
  return editor.registerCommand<KeyboardEvent>(
    KEY_TAB_COMMAND,
    $handleMarkdownTab,
    COMMAND_PRIORITY_CRITICAL
  );
}
