import { $isCodeNode } from '@lexical/code-core';
import { $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list';
import { $isTableCellNode } from '@lexical/table';
import { $findMatchingParent } from '@lexical/utils';
import {
  $createTabNode,
  $getSelection,
  $insertNodes,
  $isElementNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  COMMAND_PRIORITY_CRITICAL,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  type TabNode,
} from 'lexical';

function $getListItemAncestor(node: LexicalNode): ListItemNode | null {
  return $findMatchingParent(node, $isListItemNode);
}

// Finds a tab node touching the collapsed cursor, preferring the one before
// it (so Shift+Tab undoes the Tab that was just typed) and falling back to
// the one after it (cursor sitting in front of a leading tab).
function $getAdjacentTab(selection: RangeSelection): TabNode | null {
  if (!selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();

  let before: LexicalNode | null = null;
  let after: LexicalNode | null = null;

  if (anchor.type === 'element' && $isElementNode(anchorNode)) {
    before = anchorNode.getChildAtIndex(anchor.offset - 1);
    after = anchorNode.getChildAtIndex(anchor.offset);
  } else if ($isTextNode(anchorNode)) {
    if (anchor.offset === 0) {
      before = anchorNode.getPreviousSibling();
      after = anchorNode;
    } else if (anchor.offset === anchorNode.getTextContentSize()) {
      before = anchorNode;
      after = anchorNode.getNextSibling();
    }
  }

  if ($isTabNode(before)) {
    return before;
  }
  if ($isTabNode(after)) {
    return after;
  }
  return null;
}

function $removeAdjacentTab(selection: RangeSelection): boolean {
  const tabNode = $getAdjacentTab(selection);
  if (tabNode === null) {
    return false;
  }
  tabNode.remove();
  return true;
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

export function $handleMarkdownTab(event: KeyboardEvent): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const anchorNode = selection.anchor.getNode();

  // Code blocks and tables have their own Tab handlers (multiline code
  // indent, cell navigation) registered at lower priorities; defer to them.
  if (
    $findMatchingParent(anchorNode, $isCodeNode) !== null ||
    $findMatchingParent(anchorNode, $isTableCellNode) !== null
  ) {
    return false;
  }

  const listItem = $getListItemAncestor(anchorNode);
  if (listItem !== null) {
    if ($indentListItem(listItem, event.shiftKey)) {
      event.preventDefault();
      return true;
    }
    // Shift+Tab on a top-level item: nothing to outdent, but still consume
    // the event so focus doesn't escape the editor.
    event.preventDefault();
    return true;
  }

  if (event.shiftKey) {
    if ($removeAdjacentTab(selection)) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  const tabNode = $createTabNode();
  tabNode.setFormat(selection.format);
  tabNode.setStyle(selection.style);
  $insertNodes([tabNode]);
  event.preventDefault();
  return true;
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
