/**
 * Arrow-key navigation for gaps between gapless blocks (HR, code, table).
 *
 * Inserts transient paragraphs on demand so users can edit between blocks
 * that have no natural empty line. Only intercepts arrows when:
 * - a vertical arrow targets an adjacent HR from a text-flow block boundary, or
 * - exiting an empty transient (remove + land focus), or
 * - at a gapless boundary where a transient would be created (including gapless→gapless).
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
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  HISTORY_MERGE_TAG,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  mergeRegister,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
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
} from '../nodes/transient-paragraph-node';

export const TRANSIENT_RECONCILE_TAG = 'transient-reconcile';

type TransientTraversalDirection = 'backward' | 'forward';
type TransientTraversalAxis = 'vertical' | 'block';

// TableExtension registers horizontal KEY_ARROW_* at HIGH when a table mounts
// (after this extension) and exits the table before gap navigation can run.
const BLOCK_AXIS_GAP_ARROW_COMMANDS: ReadonlyArray<
  readonly [
    typeof KEY_ARROW_LEFT_COMMAND | typeof KEY_ARROW_RIGHT_COMMAND,
    TransientTraversalDirection,
  ]
> = [
  [KEY_ARROW_LEFT_COMMAND, 'backward'],
  [KEY_ARROW_RIGHT_COMMAND, 'forward'],
];

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

export function $getRootBlock(node: LexicalNode): ElementNode | null {
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
    $prepareTransientForCaret(existing);
    existing.selectStart();
    return existing;
  }

  const transient = $createTransientParagraphNode();
  node.insertBefore(transient);
  $prepareTransientForCaret(transient);
  transient.selectStart();
  return transient;
}

function $insertAndSelectTransientAfter(
  node: LexicalNode
): TransientParagraphNode {
  const existing = node.getNextSibling();
  if ($isTransientParagraphNode(existing)) {
    $prepareTransientForCaret(existing);
    existing.selectStart();
    return existing;
  }

  const transient = $createTransientParagraphNode();
  node.insertAfter(transient);
  $prepareTransientForCaret(transient);
  transient.selectStart();
  return transient;
}

export function $selectTransientGapAfterExportRootIndex(
  afterRootIndex: number,
  textOffset = 0
): { key: string; offset: number } | null {
  const rootChildren = $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
  const block = rootChildren[afterRootIndex];
  if (block === undefined) {
    return null;
  }

  const transient = $insertAndSelectTransientAfter(block);
  const text = transient.getFirstChild();
  if (!$isTextNode(text)) {
    return null;
  }

  return {
    key: text.getKey(),
    offset: Math.max(0, Math.min(textOffset, text.getTextContentSize())),
  };
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
  transient.remove();

  if (direction === 'backward') {
    if (prev !== null && $isGaplessBlock(prev)) {
      if (next !== null && $isGaplessBlock(next)) {
        $enterGaplessAtBoundary(prev, 'exit', axis);
        return;
      }

      const beforePrev = prev.getPreviousSibling();
      if (beforePrev !== null && $isGaplessBlock(beforePrev)) {
        $insertAndSelectTransientBefore(prev);
        return;
      }

      $enterGaplessAtBoundary(prev, 'exit', axis);
    }
    return;
  }

  if (next !== null && $isGaplessBlock(next)) {
    if (prev !== null && $isGaplessBlock(prev)) {
      $enterGaplessAtBoundary(next, 'entry', axis);
      return;
    }

    const afterNext = next.getNextSibling();
    if (afterNext !== null && $isGaplessBlock(afterNext)) {
      $insertAndSelectTransientBefore(afterNext);
      return;
    }

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
    return false;
  }

  const prev = transient.getPreviousSibling();
  const next = transient.getNextSibling();
  if (direction === 'backward' && prev === null) {
    return false;
  }
  if (direction === 'forward' && next === null) {
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

function $resolveElementAnchorText(
  anchor: ElementNode,
  offset: number
): TextNode | null {
  const firstText = anchor.getFirstDescendant();
  const lastText = anchor.getLastDescendant();
  if (offset === 0 && $isTextNode(firstText)) {
    return firstText;
  }
  if ($isTextNode(lastText)) {
    return lastText;
  }
  return null;
}

function $resolveCaretTextNode(
  selection: ReturnType<typeof $getSelection>
): TextNode | null {
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor.getNode();
  if ($isTextNode(anchor)) {
    return anchor;
  }

  if ($isElementNode(anchor) && selection.anchor.type === 'element') {
    return $resolveElementAnchorText(anchor, selection.anchor.offset);
  }

  return null;
}

/** Vertical edge within a block: first/last text region, column-independent. */
function $isAtTextRegionEdge(
  selection: ReturnType<typeof $getSelection>,
  block: ElementNode,
  edge: 'first' | 'last'
): boolean {
  const target =
    edge === 'first' ? block.getFirstDescendant() : block.getLastDescendant();
  if (!$isTextNode(target)) {
    return false;
  }

  const active = $resolveCaretTextNode(selection);
  return active !== null && active.getKey() === target.getKey();
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
    const resolved = $resolveElementAnchorText(anchor, selection.anchor.offset);
    if (resolved === null) {
      return null;
    }
    anchorKey = resolved.getKey();
    anchorOffset =
      selection.anchor.offset === 0 ? 0 : resolved.getTextContentSize();
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

function $isAtVerticalLineBoundaryInBlock(
  selection: ReturnType<typeof $getSelection>,
  block: ElementNode,
  direction: TransientTraversalDirection
): boolean {
  const position = $getCaretGlobalOffsetInElement(selection, block);
  if (position !== null) {
    return $isAtVerticalLineBoundary(
      position.text,
      position.offset,
      direction === 'backward' ? 'start' : 'end'
    );
  }

  return direction === 'backward'
    ? $isAtContainerContentStart(selection, block)
    : $isAtContainerContentEnd(selection, block);
}

function $blockHasMultipleTextRegions(block: ElementNode): boolean {
  const first = block.getFirstDescendant();
  const last = block.getLastDescendant();
  return first !== null && last !== null && first.getKey() !== last.getKey();
}

function $isAtVerticalBoundaryInBlock(
  selection: ReturnType<typeof $getSelection>,
  block: ElementNode,
  direction: TransientTraversalDirection
): boolean {
  const edge = direction === 'backward' ? 'first' : 'last';

  // Multiple text regions (list items, quote paragraphs): edge is by region, not column.
  if ($blockHasMultipleTextRegions(block)) {
    return $isAtTextRegionEdge(selection, block, edge);
  }

  // Single text flow (paragraph, code, one-line item): edge is by line within the text.
  return $isAtVerticalLineBoundaryInBlock(selection, block, direction);
}

export function $isAtBoundary(
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

  if (axis === 'vertical') {
    return $isAtVerticalBoundaryInBlock(selection, block, direction);
  }

  if ($isCodeNode(block)) {
    return direction === 'backward'
      ? $isAtContainerContentStart(selection, block)
      : $isAtContainerContentEnd(selection, block);
  }

  return direction === 'backward'
    ? $isAtContainerContentStart(selection, block)
    : $isAtContainerContentEnd(selection, block);
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

function $handleEnterGapFromGaplessElementArrow(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const rootBlock = $getRootBlock(selection.anchor.getNode());
  if (!rootBlock || !$isGaplessElementBlock(rootBlock)) {
    return false;
  }

  if (
    direction === 'backward' &&
    $isAtBoundary(selection, rootBlock, 'backward', axis)
  ) {
    const prev = rootBlock.getPreviousSibling();
    if (prev !== null && $isGapBetweenGapless(prev, rootBlock)) {
      event.preventDefault();
      $insertAndSelectTransientBefore(rootBlock);
      return true;
    }

    if (!prev) {
      event.preventDefault();
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
      $insertAndSelectTransientBefore(next);
      return true;
    }

    if (!next) {
      event.preventDefault();
      $insertAndSelectTransientAfter(rootBlock);
      return true;
    }
  }

  return false;
}

function $shouldDeferHorizontalRuleToTransientGap(
  rootBlock: ElementNode,
  hr: LexicalNode,
  direction: TransientTraversalDirection
): boolean {
  if (!$isGaplessElementBlock(rootBlock)) {
    return false;
  }

  const prev = direction === 'backward' ? hr : rootBlock;
  const next = direction === 'forward' ? hr : rootBlock;
  return $isGapBetweenGapless(prev, next);
}

function $handleHorizontalRuleVerticalArrow(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  if (axis !== 'vertical') {
    return false;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }

  const rootBlock = $getRootBlock(selection.anchor.getNode());
  if (!rootBlock) {
    return false;
  }

  if (!$isAtBoundary(selection, rootBlock, direction, axis)) {
    return false;
  }

  if (direction === 'backward') {
    const prev = rootBlock.getPreviousSibling();
    if (prev !== null && $isHorizontalRuleNode(prev)) {
      if (
        $shouldDeferHorizontalRuleToTransientGap(rootBlock, prev, direction)
      ) {
        return false;
      }

      event.preventDefault();
      $selectGaplessBlock(prev);
      return true;
    }
  }

  if (direction === 'forward') {
    const next = rootBlock.getNextSibling();
    if (next !== null && $isHorizontalRuleNode(next)) {
      if (
        $shouldDeferHorizontalRuleToTransientGap(rootBlock, next, direction)
      ) {
        return false;
      }

      event.preventDefault();
      $selectGaplessBlock(next);
      return true;
    }
  }

  return false;
}

function $handleGaplessBlockArrow(
  event: KeyboardEvent,
  direction: 'previous' | 'next'
): boolean {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) {
    return false;
  }

  const block = selection.getNodes().find($isGaplessBlock);
  if (!block) {
    return false;
  }

  if (direction === 'next') {
    const next = block.getNextSibling();
    if (next !== null && $isTextFlowBlock(next)) {
      if (!$isHorizontalRuleNode(block)) {
        return false;
      }

      event.preventDefault();
      $selectTextFlowBoundary(next, 'start');
      return true;
    }

    if (next !== null && $isGapBetweenGapless(block, next)) {
      event.preventDefault();
      $insertAndSelectTransientBefore(next);
      return true;
    }

    if (!next) {
      event.preventDefault();
      $insertAndSelectTransientAfter(block);
      return true;
    }

    return false;
  }

  const prev = block.getPreviousSibling();
  if (prev !== null && $isTextFlowBlock(prev)) {
    if (!$isHorizontalRuleNode(block)) {
      return false;
    }

    event.preventDefault();
    $selectTextFlowBoundary(prev, 'end');
    return true;
  }

  if (prev !== null && $isGapBetweenGapless(prev, block)) {
    event.preventDefault();
    $insertAndSelectTransientBefore(block);
    return true;
  }

  if (!prev) {
    event.preventDefault();
    $insertAndSelectTransientBefore(block);
    return true;
  }

  return false;
}

function $handleGapArrowCommand(
  event: KeyboardEvent,
  direction: TransientTraversalDirection,
  axis: TransientTraversalAxis
): boolean {
  if (event.altKey) {
    return false;
  }

  if ($handleExitEmptyTransientArrow(event, direction, axis)) {
    return true;
  }

  if ($handleHorizontalRuleVerticalArrow(event, direction, axis)) {
    return true;
  }

  const lexicalDirection = direction === 'backward' ? 'previous' : 'next';
  if ($handleGaplessBlockArrow(event, lexicalDirection)) {
    return true;
  }

  if ($handleEnterGapFromGaplessElementArrow(event, direction, axis)) {
    return true;
  }

  return false;
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
  return mergeRegister(
    editor.registerUpdateListener(({ tags }) => {
      if (tags.has(TRANSIENT_RECONCILE_TAG)) {
        return;
      }

      editor.update(
        () => {
          const focusedKey =
            $getCurrentTransientFromSelection()?.getKey() ?? null;
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
      KEY_ARROW_DOWN_COMMAND,
      (event) => $handleGapArrowCommand(event, 'forward', 'vertical'),
      COMMAND_PRIORITY_HIGH
    ),
    ...BLOCK_AXIS_GAP_ARROW_COMMANDS.map(([command, direction]) =>
      editor.registerCommand(
        command,
        (event) => $handleGapArrowCommand(event, direction, 'block'),
        COMMAND_PRIORITY_CRITICAL
      )
    )
  );
}
