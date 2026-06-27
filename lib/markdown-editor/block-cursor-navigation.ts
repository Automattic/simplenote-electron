/**
 * Arrow-key navigation for gaps between gapless blocks (HR, code, table).
 *
 * Inserts transient paragraphs on demand so users can edit between blocks
 * that have no natural empty line. Only intercepts arrows when:
 * - an HR is involved (Lexical cannot node-select void HRs),
 * - exiting an empty transient (remove + land focus), or
 * - at a gapless boundary where a transient would be created.
 * Everything else falls through to Lexical.
 *
 * Spec: .cursor/specs/transient-paragraph-navigation.md
 */
import {
  $addUpdateTag,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getNodeByKey,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  HISTORY_MERGE_TAG,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  mergeRegister,
  type ElementNode,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isCodeNode } from '@lexical/code-core';
import { $isListNode } from '@lexical/list';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import {
  $isTableNode,
  $isTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowNodeFromTableCellNodeOrThrow,
} from '@lexical/table';

import {
  $createTransientParagraphNode,
  $isTransientParagraphNode,
  TransientParagraphNode,
} from './transient-paragraph-node';

export const TRANSIENT_RECONCILE_TAG = 'transient-reconcile';

const TRANSIENT_NAV_DEBUG_KEY = 'simplenote:debug:transient-nav';
const TEXT_LOG_DEBOUNCE_MS = 600;

type TransientTraversalDirection = 'backward' | 'forward';
type TransientTraversalAxis = 'vertical' | 'block';

const transientNavDebugState = {
  editor: null as LexicalEditor | null,
  textLogTimer: null as ReturnType<typeof setTimeout> | null,
  pendingTextChanges: [] as Array<Record<string, unknown>>,
  collectSkipReasons: false,
  skipReasons: [] as Array<Record<string, unknown>>,
};

export function setTransientNavDebugEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (enabled) {
    localStorage.setItem(TRANSIENT_NAV_DEBUG_KEY, '1');
    console.info('[transient-nav] debug enabled');
    return;
  }

  localStorage.removeItem(TRANSIENT_NAV_DEBUG_KEY);
  clearTransientNavTextLogTimer();
  transientNavDebugState.pendingTextChanges = [];
  console.info('[transient-nav] debug disabled');
}

export function isTransientNavDebugEnabled(): boolean {
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as { __SIMPLENOTE_DEBUG_TRANSIENT_NAV__?: boolean })
      .__SIMPLENOTE_DEBUG_TRANSIENT_NAV__ === true
  ) {
    return true;
  }

  if (typeof localStorage === 'undefined') {
    return false;
  }

  return localStorage.getItem(TRANSIENT_NAV_DEBUG_KEY) === '1';
}

function formatArrowDirection(direction: TransientTraversalDirection): string {
  return direction === 'backward' ? '↑' : '↓';
}

function clearTransientNavTextLogTimer(): void {
  if (transientNavDebugState.textLogTimer !== null) {
    clearTimeout(transientNavDebugState.textLogTimer);
    transientNavDebugState.textLogTimer = null;
  }
}

function flushTransientNavTextLog(): void {
  const pending = transientNavDebugState.pendingTextChanges;
  if (pending.length === 0) {
    return;
  }

  transientNavDebugState.pendingTextChanges = [];

  const typedText = pending
    .map((change) => change.inserted)
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    )
    .join('');

  logTransientNav('text change', {
    typed: typedText.length > 0 ? typedText : undefined,
    changes: pending,
    selection: $describeSelectionContext(),
    document: $describeDocumentSnapshot(),
  });
}

function queueTransientNavTextLog(
  changes: Array<Record<string, unknown>>
): void {
  transientNavDebugState.pendingTextChanges.push(...changes);

  const editor = transientNavDebugState.editor;
  if (!editor) {
    return;
  }

  clearTransientNavTextLogTimer();
  transientNavDebugState.textLogTimer = setTimeout(() => {
    transientNavDebugState.textLogTimer = null;
    editor.getEditorState().read(() => {
      flushTransientNavTextLog();
    });
  }, TEXT_LOG_DEBOUNCE_MS);
}

export function $isBlockCursorNode(
  node: LexicalNode | null | undefined
): boolean {
  const target = node ?? null;
  if (!target || !$isDecoratorNode(target)) {
    return false;
  }
  return !target.isInline();
}

/** Blocks that already provide a normal text caret at their boundary. */
export function $isTextFlowBlock(
  node: LexicalNode | null | undefined
): node is LexicalNode {
  const target = node ?? null;
  if (!target || $isTransientParagraphNode(target)) {
    return false;
  }

  return (
    $isParagraphNode(target) ||
    $isHeadingNode(target) ||
    $isQuoteNode(target) ||
    $isListNode(target)
  );
}

/** Root blocks where you cannot click an empty line between adjacent blocks. */
export function $isGaplessBlock(node: LexicalNode | null | undefined): boolean {
  const target = node ?? null;
  if (
    !target ||
    $isTransientParagraphNode(target) ||
    $isTextFlowBlock(target)
  ) {
    return false;
  }

  return (
    $isBlockCursorNode(target) || $isCodeNode(target) || $isTableNode(target)
  );
}

export function $isGapBetweenGapless(
  prev: LexicalNode | null,
  next: LexicalNode | null
): boolean {
  if ($isTextFlowBlock(prev) || $isTextFlowBlock(next)) {
    return false;
  }

  return $isGaplessBlock(prev) && $isGaplessBlock(next);
}

function $getRootBlock(node: LexicalNode): ElementNode | null {
  let current: LexicalNode | null = node;
  while (current !== null) {
    const parent: LexicalNode | null = current.getParent();
    if (parent !== null && parent.getType() === 'root') {
      return $isElementNode(current) ? current : null;
    }
    current = parent;
  }
  return null;
}

function $isEmptyTransient(
  node: LexicalNode | null
): node is TransientParagraphNode {
  return $isTransientParagraphNode(node) && node.getTextContent().length === 0;
}

function $prepareTransientForCaret(transient: TransientParagraphNode): void {
  if (transient.getChildrenSize() === 0) {
    transient.append($createTextNode(''));
  }
}

function $insertAndSelectTransientBefore(
  node: LexicalNode
): TransientParagraphNode {
  const existing = node.getPreviousSibling();
  if ($isTransientParagraphNode(existing)) {
    logTransientNav('reuse transient before', {
      target: $describeBlock(node),
      transient: $describeBlock(existing),
    });
    $prepareTransientForCaret(existing);
    existing.selectStart();
    return existing;
  }

  const transient = $createTransientParagraphNode();
  node.insertBefore(transient);
  logTransientNav('insert transient before', {
    target: $describeBlock(node),
    transient: $describeBlock(transient),
    document: $describeDocumentSnapshot(),
  });
  $prepareTransientForCaret(transient);
  transient.selectStart();
  return transient;
}

function $insertAndSelectTransientAfter(
  node: LexicalNode
): TransientParagraphNode {
  const existing = node.getNextSibling();
  if ($isTransientParagraphNode(existing)) {
    logTransientNav('reuse transient after', {
      target: $describeBlock(node),
      transient: $describeBlock(existing),
    });
    $prepareTransientForCaret(existing);
    existing.selectStart();
    return existing;
  }

  const transient = $createTransientParagraphNode();
  node.insertAfter(transient);
  logTransientNav('insert transient after', {
    target: $describeBlock(node),
    transient: $describeBlock(transient),
    document: $describeDocumentSnapshot(),
  });
  $prepareTransientForCaret(transient);
  transient.selectStart();
  return transient;
}

/** Remove empty transients that are no longer focused or sit next to text-flow blocks. */
export function $pruneTransients(
  focusedTransientKey: string | null = null
): void {
  for (const child of $getRoot().getChildren()) {
    if (!$isEmptyTransient(child)) {
      continue;
    }

    if (child.getKey() === focusedTransientKey) {
      continue;
    }

    logTransientNav('prune empty transient', {
      transient: $describeBlock(child),
      focusedTransientKey,
    });
    child.remove();
  }

  for (const child of $getRoot().getChildren()) {
    if (!$isTransientParagraphNode(child)) {
      continue;
    }

    const prev = child.getPreviousSibling();
    const next = child.getNextSibling();
    if (
      child.getKey() !== focusedTransientKey &&
      ($isTextFlowBlock(prev) || $isTextFlowBlock(next))
    ) {
      logTransientNav('prune transient adjacent to text-flow', {
        transient: $describeBlock(child),
        prev: $describeBlock(prev),
        next: $describeBlock(next),
        focusedTransientKey,
      });
      child.remove();
    }
  }
}

function $promoteTransientWithContent(node: TransientParagraphNode): void {
  if (node.getTextContent().length === 0) {
    return;
  }

  const paragraph = $createParagraphNode();
  for (const child of node.getChildren()) {
    paragraph.append(child);
  }
  node.replace(paragraph);
  paragraph.selectEnd();
}

export function $getCurrentTransientFromSelection(): TransientParagraphNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  if ($isTransientParagraphNode(anchorNode)) {
    return anchorNode;
  }

  const parent = anchorNode.getParent();
  if ($isTransientParagraphNode(parent)) {
    return parent;
  }

  return null;
}

function $selectTextFlowBoundary(
  node: LexicalNode,
  edge: 'start' | 'end'
): void {
  if (!$isElementNode(node)) {
    return;
  }

  if (edge === 'end') {
    node.selectEnd();
  } else {
    node.selectStart();
  }

  const selection = $getSelection();
  if ($isRangeSelection(selection) && selection.anchor.type !== 'text') {
    $normalizeBlockSelectionToText(node, edge);
  }
}

function $selectGaplessBlock(node: LexicalNode): void {
  if ($isBlockCursorNode(node)) {
    const selection = $createNodeSelection();
    selection.add(node.getKey());
    $setSelection(selection);
    return;
  }

  if ($isElementNode(node)) {
    $selectTextFlowBoundary(node, 'start');
  }
}

function $enterGaplessAtBoundary(
  block: LexicalNode,
  edge: 'entry' | 'exit',
  axis: TransientTraversalAxis
): void {
  if ($isBlockCursorNode(block)) {
    $selectGaplessBlock(block);
    return;
  }

  if (!$isElementNode(block)) {
    return;
  }

  $selectTextFlowBoundary(block, edge === 'entry' ? 'start' : 'end');
}

function $navigateFromEmptyTransient(
  transient: TransientParagraphNode,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): void {
  const prev = transient.getPreviousSibling();
  const next = transient.getNextSibling();
  logTransientNav('exit empty transient', {
    direction,
    axis,
    transient: $describeBlock(transient),
    prev: $describeBlock(prev),
    next: $describeBlock(next),
  });
  transient.remove();

  if (direction === 'backward') {
    if (prev !== null && $isGaplessBlock(prev)) {
      if (next !== null && $isGaplessBlock(next)) {
        logTransientNav(
          'exit transient -> enter gapless prev at exit boundary',
          {
            target: $describeBlock(prev),
            axis,
          }
        );
        $enterGaplessAtBoundary(prev, 'exit', axis);
        return;
      }

      const beforePrev = prev.getPreviousSibling();
      if (beforePrev !== null && $isGaplessBlock(beforePrev)) {
        logTransientNav('exit transient -> insert before gapless prev');
        $insertAndSelectTransientBefore(prev);
        return;
      }

      logTransientNav('exit transient -> enter gapless prev at exit boundary', {
        target: $describeBlock(prev),
        axis,
      });
      $enterGaplessAtBoundary(prev, 'exit', axis);
    }
    return;
  }

  if (next !== null && $isGaplessBlock(next)) {
    if (prev !== null && $isGaplessBlock(prev)) {
      logTransientNav(
        'exit transient -> enter gapless next at entry boundary',
        {
          target: $describeBlock(next),
          axis,
        }
      );
      $enterGaplessAtBoundary(next, 'entry', axis);
      return;
    }

    const afterNext = next.getNextSibling();
    if (afterNext !== null && $isGaplessBlock(afterNext)) {
      logTransientNav('exit transient -> insert before next gapless in chain');
      $insertAndSelectTransientBefore(afterNext);
      return;
    }

    logTransientNav('exit transient -> enter gapless next at entry boundary', {
      target: $describeBlock(next),
      axis,
    });
    $enterGaplessAtBoundary(next, 'entry', axis);
  }
}

function $normalizeBlockSelectionToText(
  block: ElementNode,
  edge: 'start' | 'end'
): void {
  const descendant =
    edge === 'end' ? block.getLastDescendant() : block.getFirstDescendant();
  if (!$isTextNode(descendant)) {
    return;
  }

  const offset = edge === 'end' ? descendant.getTextContentSize() : 0;
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  selection.anchor.set(descendant.getKey(), offset, 'text');
  selection.focus.set(descendant.getKey(), offset, 'text');
  $setSelection(selection);
}

function $handleExitEmptyTransientArrow(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  const transient = $getCurrentTransientFromSelection();
  if (!$isEmptyTransient(transient)) {
    logTransientNav('skip exitEmptyTransient: not in empty transient');
    return false;
  }

  const prev = transient.getPreviousSibling();
  const next = transient.getNextSibling();
  if (direction === 'backward' && prev === null) {
    logTransientNav('skip exitEmptyTransient: leading transient at doc start');
    return false;
  }
  if (direction === 'forward' && next === null) {
    logTransientNav('skip exitEmptyTransient: trailing transient at doc end');
    return false;
  }

  event.preventDefault();
  $navigateFromEmptyTransient(transient, direction, axis);
  return true;
}

function $findTableCellAncestor(node: LexicalNode): LexicalNode | null {
  let current: LexicalNode | null = node;
  while (current !== null) {
    if ($isTableCellNode(current)) {
      return current;
    }
    current = current.getParent();
  }
  return null;
}

function $getFirstCaretBlock(container: ElementNode): ElementNode | null {
  const firstChild = container.getFirstChild();
  return firstChild !== null && $isElementNode(firstChild) ? firstChild : null;
}

function $getLastCaretBlock(container: ElementNode): ElementNode | null {
  const lastChild = container.getLastChild();
  return lastChild !== null && $isElementNode(lastChild) ? lastChild : null;
}

function $isAtContainerContentStart(
  selection: ReturnType<typeof $getSelection>,
  container: ElementNode
): boolean {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const anchor = selection.anchor.getNode();

  if ($isTextNode(anchor)) {
    if (selection.anchor.offset !== 0) {
      return false;
    }
    const first = container.getFirstDescendant();
    return $isTextNode(first) && anchor.getKey() === first.getKey();
  }

  if ($isElementNode(anchor) && selection.anchor.type === 'element') {
    if (selection.anchor.offset !== 0) {
      return false;
    }
    const firstBlock = $getFirstCaretBlock(container);
    if (firstBlock === null) {
      return anchor.getKey() === container.getKey();
    }
    return anchor.getKey() === firstBlock.getKey();
  }

  return false;
}

function $isAtContainerContentEnd(
  selection: ReturnType<typeof $getSelection>,
  container: ElementNode
): boolean {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const anchor = selection.anchor.getNode();
  const lastText = container.getLastDescendant();

  if ($isTextNode(anchor)) {
    if (!$isTextNode(lastText) || anchor.getKey() !== lastText.getKey()) {
      return false;
    }
    return selection.anchor.offset === lastText.getTextContentSize();
  }

  if ($isElementNode(anchor) && selection.anchor.type === 'element') {
    const lastBlock = $getLastCaretBlock(container);
    if (lastBlock === null) {
      return (
        anchor.getKey() === container.getKey() &&
        selection.anchor.offset === container.getChildrenSize()
      );
    }

    if (anchor.getKey() !== lastBlock.getKey()) {
      return false;
    }

    if ($isTextNode(lastText)) {
      const lastTextParent = lastText.getParent();
      if (lastTextParent?.getKey() === anchor.getKey()) {
        return selection.anchor.offset >= anchor.getChildrenSize();
      }
    }

    return selection.anchor.offset === anchor.getChildrenSize();
  }

  return false;
}

function $getCaretGlobalOffsetInElement(
  selection: ReturnType<typeof $getSelection>,
  block: ElementNode
): { text: string; offset: number } | null {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor.getNode();
  let anchorKey = anchor.getKey();
  let anchorOffset = selection.anchor.offset;

  if ($isElementNode(anchor) && selection.anchor.type === 'element') {
    const firstText = anchor.getFirstDescendant();
    const lastText = anchor.getLastDescendant();
    if (selection.anchor.offset === 0 && $isTextNode(firstText)) {
      anchorKey = firstText.getKey();
      anchorOffset = 0;
    } else if ($isTextNode(lastText)) {
      anchorKey = lastText.getKey();
      anchorOffset = lastText.getTextContentSize();
    } else {
      return null;
    }
  }

  let globalOffset = 0;
  let found = false;

  const walk = (node: LexicalNode): boolean => {
    if ($isTextNode(node)) {
      if (node.getKey() === anchorKey) {
        globalOffset += anchorOffset;
        found = true;
        return true;
      }
      globalOffset += node.getTextContentSize();
      return false;
    }

    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        if (walk(child)) {
          return true;
        }
      }
    }

    return false;
  };

  for (const child of block.getChildren()) {
    if (walk(child)) {
      break;
    }
  }

  if (!found) {
    return null;
  }

  return { text: block.getTextContent(), offset: globalOffset };
}

function $isAtVerticalLineBoundary(
  text: string,
  offset: number,
  edge: 'start' | 'end'
): boolean {
  const lineIndex = text.slice(0, offset).split('\n').length - 1;
  const lastLineIndex = text.length === 0 ? 0 : text.split('\n').length - 1;
  return edge === 'start' ? lineIndex === 0 : lineIndex === lastLineIndex;
}

function $isAtCodeVerticalBoundary(
  selection: ReturnType<typeof $getSelection>,
  codeBlock: ElementNode,
  direction: TransientTraversalDirection
): boolean {
  const position = $getCaretGlobalOffsetInElement(selection, codeBlock);
  if (position === null) {
    return false;
  }

  return $isAtVerticalLineBoundary(
    position.text,
    position.offset,
    direction === 'backward' ? 'start' : 'end'
  );
}

function $isAtTableVerticalStart(
  selection: ReturnType<typeof $getSelection>,
  table: ElementNode
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const cell = $findTableCellAncestor(selection.anchor.getNode());
  if (cell === null || !$isTableCellNode(cell)) {
    return false;
  }

  const tableNode = cell.getParents().find($isTableNode);
  if (!tableNode || tableNode.getKey() !== table.getKey()) {
    return false;
  }

  return $getTableRowIndexFromTableCellNode(cell) === 0;
}

function $isAtTableVerticalEnd(
  selection: ReturnType<typeof $getSelection>,
  table: ElementNode
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const cell = $findTableCellAncestor(selection.anchor.getNode());
  if (cell === null || !$isTableCellNode(cell)) {
    return false;
  }

  const tableNode = cell.getParents().find($isTableNode);
  if (!tableNode || tableNode.getKey() !== table.getKey()) {
    return false;
  }

  return (
    $getTableRowIndexFromTableCellNode(cell) === tableNode.getChildrenSize() - 1
  );
}

function $isAtTableBlockStart(
  selection: ReturnType<typeof $getSelection>,
  table: ElementNode
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const cell = $findTableCellAncestor(selection.anchor.getNode());
  if (cell === null || !$isTableCellNode(cell)) {
    return false;
  }

  const tableNode = cell.getParents().find($isTableNode);
  if (!tableNode || tableNode.getKey() !== table.getKey()) {
    return false;
  }

  if ($getTableRowIndexFromTableCellNode(cell) !== 0) {
    return false;
  }

  if ($getTableColumnIndexFromTableCellNode(cell) !== 0) {
    return false;
  }

  return $isAtContainerContentStart(selection, cell);
}

function $isAtTableBlockEnd(
  selection: ReturnType<typeof $getSelection>,
  table: ElementNode
): boolean {
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const cell = $findTableCellAncestor(selection.anchor.getNode());
  if (cell === null || !$isTableCellNode(cell)) {
    return false;
  }

  const tableNode = cell.getParents().find($isTableNode);
  if (!tableNode || tableNode.getKey() !== table.getKey()) {
    return false;
  }

  const rowIndex = $getTableRowIndexFromTableCellNode(cell);
  if (rowIndex !== tableNode.getChildrenSize() - 1) {
    return false;
  }

  const row = $getTableRowNodeFromTableCellNodeOrThrow(cell);
  if (
    $getTableColumnIndexFromTableCellNode(cell) !==
    row.getChildrenSize() - 1
  ) {
    return false;
  }

  return $isAtContainerContentEnd(selection, cell);
}

function $isAtBoundary(
  selection: ReturnType<typeof $getSelection>,
  block: ElementNode,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  if ($isTableNode(block)) {
    if (axis === 'vertical') {
      return direction === 'backward'
        ? $isAtTableVerticalStart(selection, block)
        : $isAtTableVerticalEnd(selection, block);
    }

    return direction === 'backward'
      ? $isAtTableBlockStart(selection, block)
      : $isAtTableBlockEnd(selection, block);
  }

  if ($isCodeNode(block)) {
    if (axis === 'vertical') {
      return $isAtCodeVerticalBoundary(selection, block, direction);
    }

    return direction === 'backward'
      ? $isAtContainerContentStart(selection, block)
      : $isAtContainerContentEnd(selection, block);
  }

  return direction === 'backward'
    ? $isAtContainerContentStart(selection, block)
    : $isAtContainerContentEnd(selection, block);
}

function $isAtTextFlowStart(
  selection: ReturnType<typeof $getSelection>,
  rootBlock: ElementNode
): boolean {
  return $isAtContainerContentStart(selection, rootBlock);
}

function $isAtTextFlowEnd(
  selection: ReturnType<typeof $getSelection>,
  rootBlock: ElementNode
): boolean {
  return $isAtContainerContentEnd(selection, rootBlock);
}

/** Gapless element blocks (code, table) keep a text caret, not node selection. */
function $isGaplessElementBlock(
  node: LexicalNode | null | undefined
): node is ElementNode {
  const target = node ?? null;
  return (
    target !== null &&
    $isGaplessBlock(target) &&
    !$isBlockCursorNode(target) &&
    $isElementNode(target)
  );
}

function $describeBlock(node: LexicalNode | null): string {
  if (node === null) {
    return '(null)';
  }

  const flags = [
    $isTransientParagraphNode(node) ? 'transient' : null,
    $isTextFlowBlock(node) ? 'text-flow' : null,
    $isGaplessBlock(node) ? 'gapless' : null,
    $isBlockCursorNode(node) ? 'block-cursor' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const textPreview = node.getTextContent().slice(0, 40).replace(/\n/g, '\\n');
  const textSuffix = textPreview.length > 0 ? ` text="${textPreview}"` : '';

  return `${node.getType()}#${node.getKey()}${flags ? ` [${flags}]` : ''}${textSuffix}`;
}

function $describeRootChildren(): string[] {
  return $getRoot()
    .getChildren()
    .map((child, index) => `${index}: ${$describeBlock(child)}`);
}

function $getFocusedRootBlockIndex(): {
  focusedIndex: number;
  focusedKey: string | null;
} {
  const children = $getRoot().getChildren();
  const selection = $getSelection();
  let focusedKey: string | null = null;

  if ($isRangeSelection(selection)) {
    const rootBlock = $getRootBlock(selection.anchor.getNode());
    focusedKey = rootBlock?.getKey() ?? null;
  } else if ($isNodeSelection(selection)) {
    const node = selection.getNodes()[0];
    if (node !== undefined && node.getParent()?.getType() === 'root') {
      focusedKey = node.getKey();
    }
  }

  if (focusedKey === null) {
    return { focusedIndex: -1, focusedKey: null };
  }

  return {
    focusedIndex: children.findIndex((child) => child.getKey() === focusedKey),
    focusedKey,
  };
}

/** Root blocks near the caret plus the full numbered root list. */
function $describeDocumentSnapshot(): Record<string, unknown> {
  const children = $getRoot().getChildren();
  const { focusedIndex, focusedKey } = $getFocusedRootBlockIndex();
  const windowStart = Math.max(0, focusedIndex - 2);
  const windowEnd =
    focusedIndex >= 0
      ? Math.min(children.length, focusedIndex + 3)
      : Math.min(children.length, 5);

  const surrounding = [];
  for (let index = windowStart; index < windowEnd; index++) {
    surrounding.push({
      index,
      focused: index === focusedIndex,
      block: $describeBlock(children[index]),
    });
  }

  return {
    rootChildCount: children.length,
    focusedIndex,
    focusedKey,
    surrounding,
    rootChildren: $describeRootChildren(),
  };
}

function $describeTextChanges(
  prevEditorState: EditorState,
  dirtyLeaves: ReadonlySet<string>
): Array<Record<string, unknown>> {
  const changes: Array<Record<string, unknown>> = [];

  for (const key of dirtyLeaves) {
    const afterNode = $getNodeByKey(key);
    if (afterNode === null || !$isTextNode(afterNode)) {
      continue;
    }

    const before = prevEditorState.read(() => {
      const node = $getNodeByKey(key);
      return node !== null && $isTextNode(node) ? node.getTextContent() : null;
    });
    const after = afterNode.getTextContent();

    if (before === after) {
      continue;
    }

    const rootBlock = $getRootBlock(afterNode);
    changes.push({
      textNode: $describeBlock(afterNode),
      rootBlock: rootBlock ? $describeBlock(rootBlock) : null,
      before: before ?? '(new)',
      after,
      inserted:
        before !== null && after.startsWith(before)
          ? after.slice(before.length)
          : null,
      deleted:
        before !== null && before.startsWith(after)
          ? before.slice(after.length)
          : null,
    });
  }

  return changes;
}

function $logTransientNavTextChanges(
  prevEditorState: EditorState,
  dirtyLeaves: ReadonlySet<string>
): void {
  if (!isTransientNavDebugEnabled() || dirtyLeaves.size === 0) {
    return;
  }

  const changes = $describeTextChanges(prevEditorState, dirtyLeaves);
  if (changes.length === 0) {
    return;
  }

  queueTransientNavTextLog(changes);
}

function $describeSelectionContext(
  rootBlock: ElementNode | null = null
): Record<string, unknown> {
  const selection = $getSelection();
  const resolvedRootBlock =
    rootBlock ??
    ($isRangeSelection(selection)
      ? $getRootBlock(selection.anchor.getNode())
      : null);

  if ($isNodeSelection(selection)) {
    return {
      kind: 'node',
      nodes: selection.getNodes().map($describeBlock),
      rootBlock: resolvedRootBlock ? $describeBlock(resolvedRootBlock) : null,
    };
  }

  if ($isRangeSelection(selection)) {
    const anchorNode = selection.anchor.getNode();
    return {
      kind: 'range',
      collapsed: selection.isCollapsed(),
      anchorType: selection.anchor.type,
      anchorOffset: selection.anchor.offset,
      anchorNode: $describeBlock(anchorNode),
      anchorParent: $describeBlock(anchorNode.getParent()),
      rootBlock: resolvedRootBlock ? $describeBlock(resolvedRootBlock) : null,
      atTextFlowStart:
        resolvedRootBlock !== null
          ? $isAtTextFlowStart(selection, resolvedRootBlock)
          : null,
      atTextFlowEnd:
        resolvedRootBlock !== null
          ? $isAtTextFlowEnd(selection, resolvedRootBlock)
          : null,
      isTextFlowBlock:
        resolvedRootBlock !== null ? $isTextFlowBlock(resolvedRootBlock) : null,
      isGaplessBlock:
        resolvedRootBlock !== null ? $isGaplessBlock(resolvedRootBlock) : null,
      isGaplessElementBlock:
        resolvedRootBlock !== null
          ? $isGaplessElementBlock(resolvedRootBlock)
          : null,
      prevSibling: resolvedRootBlock
        ? $describeBlock(resolvedRootBlock.getPreviousSibling())
        : null,
      nextSibling: resolvedRootBlock
        ? $describeBlock(resolvedRootBlock.getNextSibling())
        : null,
    };
  }

  return { kind: selection === null ? 'null' : 'other' };
}

function logTransientNav(
  message: string,
  details?: Record<string, unknown>
): void {
  if (!isTransientNavDebugEnabled()) {
    return;
  }

  if (message.startsWith('skip ')) {
    if (transientNavDebugState.collectSkipReasons) {
      transientNavDebugState.skipReasons.push({
        reason: message.slice(5),
        ...details,
      });
    }
    return;
  }

  if (details === undefined) {
    console.log(`[transient-nav] ${message}`);
    return;
  }

  console.log(`[transient-nav] ${message}`, details);
}

function logTransientNavArrowResult(
  arrow: string,
  handler: string | null,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): void {
  if (handler === null) {
    logTransientNav(`${arrow} not handled`, {
      direction,
      axis,
      selection: $describeSelectionContext(),
      document: $describeDocumentSnapshot(),
      skipReasons: transientNavDebugState.skipReasons,
    });
    return;
  }

  logTransientNav(`${arrow} handled via ${handler}`, {
    direction,
    axis,
    selection: $describeSelectionContext(),
    document: $describeDocumentSnapshot(),
  });
}

function $handleEnterGapFromGaplessElementArrow(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    logTransientNav('skip gaplessElement: not collapsed range selection');
    return false;
  }

  const rootBlock = $getRootBlock(selection.anchor.getNode());
  if (!rootBlock || !$isGaplessElementBlock(rootBlock)) {
    logTransientNav('skip gaplessElement: not in gapless element root block', {
      rootBlock: rootBlock ? $describeBlock(rootBlock) : null,
    });
    return false;
  }

  if (
    direction === 'backward' &&
    $isAtBoundary(selection, rootBlock, 'backward', axis)
  ) {
    const prev = rootBlock.getPreviousSibling();
    if (prev !== null && $isGapBetweenGapless(prev, rootBlock)) {
      event.preventDefault();
      logTransientNav(
        'gaplessElement backward: insert transient before block',
        {
          rootBlock: $describeBlock(rootBlock),
          prev: $describeBlock(prev),
        }
      );
      $insertAndSelectTransientBefore(rootBlock);
      return true;
    }

    if (!prev) {
      event.preventDefault();
      logTransientNav('gaplessElement backward: leading transient');
      $insertAndSelectTransientBefore(rootBlock);
      return true;
    }
  }

  if (
    direction === 'forward' &&
    $isAtBoundary(selection, rootBlock, 'forward', axis)
  ) {
    const next = rootBlock.getNextSibling();
    if (next !== null && $isGapBetweenGapless(rootBlock, next)) {
      event.preventDefault();
      logTransientNav('gaplessElement forward: insert transient before next', {
        rootBlock: $describeBlock(rootBlock),
        next: $describeBlock(next),
      });
      $insertAndSelectTransientBefore(next);
      return true;
    }

    if (!next) {
      event.preventDefault();
      logTransientNav('gaplessElement forward: trailing transient');
      $insertAndSelectTransientAfter(rootBlock);
      return true;
    }
  }

  logTransientNav('skip gaplessElement: not at block boundary', {
    direction,
    axis,
    rootBlock: $describeBlock(rootBlock),
    atStart: $isAtBoundary(selection, rootBlock, 'backward', axis),
    atEnd: $isAtBoundary(selection, rootBlock, 'forward', axis),
  });
  return false;
}

function $handleHorizontalRuleFromTextFlowArrow(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    logTransientNav(
      'skip horizontalRuleFromText: not collapsed range selection'
    );
    return false;
  }

  const rootBlock = $getRootBlock(selection.anchor.getNode());
  if (!rootBlock || !$isTextFlowBlock(rootBlock)) {
    logTransientNav(
      'skip horizontalRuleFromText: not in text-flow root block',
      {
        rootBlock: rootBlock ? $describeBlock(rootBlock) : null,
      }
    );
    return false;
  }

  if (
    direction === 'backward' &&
    $isAtBoundary(selection, rootBlock, 'backward', axis)
  ) {
    const prev = rootBlock.getPreviousSibling();
    if (prev !== null && $isHorizontalRuleNode(prev)) {
      event.preventDefault();
      logTransientNav('horizontalRuleFromText backward: select HR', {
        rootBlock: $describeBlock(rootBlock),
        prev: $describeBlock(prev),
      });
      $selectGaplessBlock(prev);
      return true;
    }
  }

  if (
    direction === 'forward' &&
    $isAtBoundary(selection, rootBlock, 'forward', axis)
  ) {
    const next = rootBlock.getNextSibling();
    if (next !== null && $isHorizontalRuleNode(next)) {
      event.preventDefault();
      logTransientNav('horizontalRuleFromText forward: select HR', {
        rootBlock: $describeBlock(rootBlock),
        next: $describeBlock(next),
      });
      $selectGaplessBlock(next);
      return true;
    }
  }

  logTransientNav('skip horizontalRuleFromText: no HR neighbor at boundary', {
    direction,
    axis,
    rootBlock: $describeBlock(rootBlock),
    atStart: $isAtBoundary(selection, rootBlock, 'backward', axis),
    atEnd: $isAtBoundary(selection, rootBlock, 'forward', axis),
  });
  return false;
}

function $handleGaplessBlockArrow(
  event: KeyboardEvent,
  direction: 'previous' | 'next'
): boolean {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    logTransientNav('skip gaplessBlock: not node selection');
    return false;
  }

  const block = selection.getNodes().find($isGaplessBlock);
  if (!block) {
    logTransientNav('skip gaplessBlock: no gapless node in selection');
    return false;
  }

  if (direction === 'next') {
    const next = block.getNextSibling();
    if (next !== null && $isTextFlowBlock(next)) {
      if (!$isHorizontalRuleNode(block)) {
        logTransientNav('skip gaplessBlock next: defer text-flow to Lexical', {
          block: $describeBlock(block),
          next: $describeBlock(next),
        });
        return false;
      }

      event.preventDefault();
      logTransientNav('gaplessBlock next: select text-flow start', {
        block: $describeBlock(block),
        next: $describeBlock(next),
      });
      $selectTextFlowBoundary(next, 'start');
      return true;
    }

    if (next !== null && $isGapBetweenGapless(block, next)) {
      event.preventDefault();
      logTransientNav('gaplessBlock next: insert transient before next', {
        block: $describeBlock(block),
        next: $describeBlock(next),
      });
      $insertAndSelectTransientBefore(next);
      return true;
    }

    if (!next) {
      event.preventDefault();
      logTransientNav('gaplessBlock next: trailing transient', {
        block: $describeBlock(block),
      });
      $insertAndSelectTransientAfter(block);
      return true;
    }

    logTransientNav('skip gaplessBlock next: unmatched sibling', {
      block: $describeBlock(block),
      next: $describeBlock(next),
    });
    return false;
  }

  const prev = block.getPreviousSibling();
  if (prev !== null && $isTextFlowBlock(prev)) {
    if (!$isHorizontalRuleNode(block)) {
      logTransientNav(
        'skip gaplessBlock previous: defer text-flow to Lexical',
        {
          block: $describeBlock(block),
          prev: $describeBlock(prev),
        }
      );
      return false;
    }

    event.preventDefault();
    logTransientNav('gaplessBlock previous: select text-flow end', {
      block: $describeBlock(block),
      prev: $describeBlock(prev),
    });
    $selectTextFlowBoundary(prev, 'end');
    return true;
  }

  if (prev !== null && $isGapBetweenGapless(prev, block)) {
    event.preventDefault();
    logTransientNav('gaplessBlock previous: insert transient before block', {
      block: $describeBlock(block),
      prev: $describeBlock(prev),
    });
    $insertAndSelectTransientBefore(block);
    return true;
  }

  if (!prev) {
    event.preventDefault();
    logTransientNav('gaplessBlock previous: leading transient', {
      block: $describeBlock(block),
    });
    $insertAndSelectTransientBefore(block);
    return true;
  }

  logTransientNav('skip gaplessBlock previous: unmatched sibling', {
    block: $describeBlock(block),
    prev: $describeBlock(prev),
  });
  return false;
}

function $handleGapArrowCommand(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  const arrow = formatArrowDirection(direction);

  transientNavDebugState.collectSkipReasons = true;
  transientNavDebugState.skipReasons = [];

  try {
    if ($handleExitEmptyTransientArrow(event, direction, axis)) {
      logTransientNavArrowResult(arrow, 'exitEmptyTransient', direction, axis);
      return true;
    }

    if ($handleHorizontalRuleFromTextFlowArrow(event, direction, axis)) {
      logTransientNavArrowResult(
        arrow,
        'horizontalRuleFromText',
        direction,
        axis
      );
      return true;
    }

    const lexicalDirection = direction === 'backward' ? 'previous' : 'next';
    if ($handleGaplessBlockArrow(event, lexicalDirection)) {
      logTransientNavArrowResult(arrow, 'gaplessBlock', direction, axis);
      return true;
    }

    if ($handleEnterGapFromGaplessElementArrow(event, direction, axis)) {
      logTransientNavArrowResult(arrow, 'gaplessElement', direction, axis);
      return true;
    }

    logTransientNavArrowResult(arrow, null, direction, axis);
    return false;
  } finally {
    transientNavDebugState.collectSkipReasons = false;
  }
}

function $isEmptyParagraph(block: ElementNode): boolean {
  return $isParagraphNode(block) && block.getTextContent().length === 0;
}

function $deleteEmptyParagraphBeforeTransient(
  block: ElementNode,
  transient: LexicalNode,
  event: KeyboardEvent
): boolean {
  if (!$isEmptyParagraph(block)) {
    return false;
  }

  event.preventDefault();
  block.remove();
  if ($isTransientParagraphNode(transient)) {
    transient.selectStart();
  }
  return true;
}

export function registerBlockCursorNavigation(
  editor: LexicalEditor
): () => void {
  const focusedTransientKeyRef: { current: string | null } = { current: null };

  if (typeof globalThis !== 'undefined') {
    (
      globalThis as typeof globalThis & {
        setTransientNavDebugEnabled?: typeof setTransientNavDebugEnabled;
      }
    ).setTransientNavDebugEnabled = setTransientNavDebugEnabled;
  }

  transientNavDebugState.editor = editor;

  return mergeRegister(
    () => {
      clearTransientNavTextLogTimer();
      transientNavDebugState.pendingTextChanges = [];
      if (transientNavDebugState.editor === editor) {
        transientNavDebugState.editor = null;
      }
    },
    editor.registerUpdateListener(({ tags, dirtyLeaves, prevEditorState }) => {
      if (tags.has(TRANSIENT_RECONCILE_TAG)) {
        return;
      }

      if (isTransientNavDebugEnabled() && dirtyLeaves.size > 0) {
        editor.getEditorState().read(() => {
          $logTransientNavTextChanges(prevEditorState, dirtyLeaves);
        });
      }

      editor.update(
        () => {
          const focusedKey =
            $getCurrentTransientFromSelection()?.getKey() ?? null;
          focusedTransientKeyRef.current = focusedKey;
          $addUpdateTag(HISTORY_MERGE_TAG);
          $addUpdateTag(TRANSIENT_RECONCILE_TAG);
          $pruneTransients(focusedKey);
        },
        { tag: TRANSIENT_RECONCILE_TAG }
      );
    }),

    editor.registerNodeTransform(
      TransientParagraphNode,
      $promoteTransientWithContent
    ),

    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const transient = $isTransientParagraphNode(anchorNode)
          ? anchorNode
          : $isTransientParagraphNode(anchorNode.getParent())
            ? anchorNode.getParent()
            : null;

        if (transient && $isEmptyTransient(transient)) {
          event.preventDefault();
          $navigateFromEmptyTransient(transient, 'backward', 'vertical');
          return true;
        }

        if (selection.anchor.offset === 0) {
          const block = $isElementNode(anchorNode)
            ? anchorNode
            : anchorNode.getParent();
          if (block && $isElementNode(block)) {
            const prevSibling = block.getPreviousSibling();
            if ($isTransientParagraphNode(prevSibling)) {
              if (
                $deleteEmptyParagraphBeforeTransient(block, prevSibling, event)
              ) {
                return true;
              }
              event.preventDefault();
              prevSibling.selectStart();
              return true;
            }
          }
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    ),

    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (event) => $handleGapArrowCommand(event, 'backward', 'vertical'),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      (event) => $handleGapArrowCommand(event, 'backward', 'block'),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => $handleGapArrowCommand(event, 'forward', 'vertical'),
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => $handleGapArrowCommand(event, 'forward', 'block'),
      COMMAND_PRIORITY_LOW
    )
  );
}
