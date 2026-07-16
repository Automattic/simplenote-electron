import {
  $isCodeNode,
  $plainifyCodeContent,
  type CodeNode,
} from '@lexical/code-core';
import { $isListItemNode, $isListNode, type ListItemNode } from '@lexical/list';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableCellNode } from '@lexical/table';
import { $findMatchingParent } from '@lexical/utils';
import { createDOMRange } from '@lexical/selection';
import {
  $copyNode,
  $createLineBreakNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_DOWN_COMMAND,
  mergeRegister,
  type ElementNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type PointType,
  type RangeSelection,
} from 'lexical';

import { $isSelectionInTable } from './table-controls';
import { $getRootBlock, $isAtBoundary } from './block-cursor-navigation';
import { $isEmptyLineParagraphNode } from '../nodes/empty-line-paragraph-node';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';
import { scrollRangeIntoView } from '../search/search-highlight';

type LineMoveDirection = 'up' | 'down';
type LineDuplicateDirection = 'up' | 'down';

function $nodeContainsKey(node: LexicalNode, key: NodeKey): boolean {
  if (node.getKey() === key) {
    return true;
  }

  if (!$isElementNode(node)) {
    return false;
  }

  for (const child of node.getChildren()) {
    if ($nodeContainsKey(child, key)) {
      return true;
    }
  }

  return false;
}

function $getCaretOffsetInElement(
  element: ElementNode,
  point: PointType
): number {
  let offset = 0;

  for (const child of element.getChildren()) {
    if (child.getKey() === point.key) {
      if ($isTextNode(child)) {
        return offset + point.offset;
      }

      if ($isLineBreakNode(child)) {
        return offset;
      }

      if ($isElementNode(child)) {
        return offset + $getCaretOffsetInElement(child, point);
      }

      return offset;
    }

    if ($nodeContainsKey(child, point.key)) {
      if ($isElementNode(child)) {
        return offset + $getCaretOffsetInElement(child, point);
      }
    }

    if ($isTextNode(child)) {
      offset += child.getTextContentSize();
    } else if ($isLineBreakNode(child)) {
      offset += 1;
    } else if ($isElementNode(child)) {
      offset += child.getTextContentSize();
    }
  }

  return offset;
}

function $findPointAtOffset(
  element: ElementNode,
  targetOffset: number
): PointType | null {
  let offset = 0;

  for (const child of element.getChildren()) {
    if ($isTextNode(child)) {
      const size = child.getTextContentSize();
      if (targetOffset <= offset + size) {
        const point = $createRangeSelection().anchor;
        point.set(child.getKey(), targetOffset - offset, 'text');
        return point;
      }
      offset += size;
      continue;
    }

    if ($isLineBreakNode(child)) {
      if (targetOffset <= offset) {
        const point = $createRangeSelection().anchor;
        point.set(child.getKey(), 0, 'element');
        return point;
      }
      offset += 1;
      continue;
    }

    if ($isElementNode(child)) {
      const size = child.getTextContentSize();
      if (targetOffset <= offset + size) {
        return $findPointAtOffset(child, targetOffset - offset);
      }
      offset += size;
    }
  }

  const lastDescendant = element.getLastDescendant();
  if ($isTextNode(lastDescendant)) {
    const point = $createRangeSelection().anchor;
    point.set(
      lastDescendant.getKey(),
      lastDescendant.getTextContentSize(),
      'text'
    );
    return point;
  }

  return null;
}

function $restoreCaretInElement(
  element: ElementNode,
  anchorOffset: number,
  focusOffset: number
): void {
  const anchorPoint = $findPointAtOffset(element, anchorOffset);
  const focusPoint = $findPointAtOffset(element, focusOffset);

  if (anchorPoint === null || focusPoint === null) {
    element.selectStart();
    return;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(anchorPoint.key, anchorPoint.offset, anchorPoint.type);
  selection.focus.set(focusPoint.key, focusPoint.offset, focusPoint.type);
  $setSelection(selection);
}

function $captureSelectionOffsetsInElement(
  element: ElementNode,
  selection: RangeSelection
): { anchor: number; focus: number } {
  return {
    anchor: $getCaretOffsetInElement(element, selection.anchor),
    focus: $getCaretOffsetInElement(element, selection.focus),
  };
}

function $paragraphHasSoftLineBreaks(paragraph: ElementNode): boolean {
  return paragraph.getChildren().some($isLineBreakNode);
}

function $getSoftLineSegments(paragraph: ElementNode): string[] {
  const lines = [''];

  for (const child of paragraph.getChildren()) {
    if ($isTextNode(child)) {
      lines[lines.length - 1] += child.getTextContent();
    } else if ($isLineBreakNode(child)) {
      lines.push('');
    }
  }

  return lines;
}

function $replaceParagraphSoftLines(
  paragraph: ElementNode,
  lines: string[]
): void {
  paragraph.clear();

  lines.forEach((line, index) => {
    if (line.length > 0) {
      paragraph.append($createTextNode(line));
    }

    if (index < lines.length - 1) {
      paragraph.append($createLineBreakNode());
    }
  });
}

function $getSoftLineIndex(paragraph: ElementNode, point: PointType): number {
  let lineIndex = 0;

  for (const child of paragraph.getChildren()) {
    if (child.getKey() === point.key || $nodeContainsKey(child, point.key)) {
      return lineIndex;
    }

    if ($isLineBreakNode(child)) {
      lineIndex += 1;
    }
  }

  return lineIndex;
}

function $getOffsetWithinSoftLine(
  paragraph: ElementNode,
  point: PointType,
  lineIndex: number
): number {
  let currentLine = 0;
  let offsetInLine = 0;

  for (const child of paragraph.getChildren()) {
    if (currentLine === lineIndex) {
      if (child.getKey() === point.key) {
        if ($isTextNode(child)) {
          return point.offset;
        }
        return offsetInLine;
      }

      if ($nodeContainsKey(child, point.key) && $isTextNode(child)) {
        return point.offset;
      }

      if ($isTextNode(child)) {
        offsetInLine += child.getTextContentSize();
      }
      continue;
    }

    if ($isLineBreakNode(child)) {
      currentLine += 1;
      offsetInLine = 0;
    }
  }

  return 0;
}

function $restoreCaretInSoftLine(
  paragraph: ElementNode,
  lineIndex: number,
  anchorOffsetInLine: number,
  focusOffsetInLine: number
): void {
  let currentLine = 0;
  let offsetInLine = 0;

  for (const child of paragraph.getChildren()) {
    if (currentLine === lineIndex && $isTextNode(child)) {
      const size = child.getTextContentSize();
      const anchor = Math.min(anchorOffsetInLine, size);
      const focus = Math.min(focusOffsetInLine, size);
      const selection = $createRangeSelection();
      selection.anchor.set(child.getKey(), anchor, 'text');
      selection.focus.set(child.getKey(), focus, 'text');
      $setSelection(selection);
      return;
    }

    if (currentLine === lineIndex) {
      if ($isTextNode(child)) {
        offsetInLine += child.getTextContentSize();
      }
      continue;
    }

    if ($isLineBreakNode(child)) {
      currentLine += 1;
      offsetInLine = 0;
    }
  }

  paragraph.selectStart();
}

function $tryMoveIntraParagraphLine(
  selection: RangeSelection,
  direction: LineMoveDirection
): boolean {
  const anchorNode = selection.anchor.getNode();
  const paragraph = $findMatchingParent(anchorNode, (node) => {
    return (
      $isParagraphNode(node) &&
      !$isStructuralGapParagraph(node) &&
      !$isTransientParagraphNode(node)
    );
  });

  if (
    paragraph === null ||
    !$isElementNode(paragraph) ||
    !$paragraphHasSoftLineBreaks(paragraph) ||
    $findMatchingParent(anchorNode, $isListItemNode) !== null ||
    $findMatchingParent(anchorNode, $isQuoteNode) !== null ||
    $findMatchingParent(anchorNode, $isCodeNode) !== null ||
    $findMatchingParent(anchorNode, $isTableCellNode) !== null
  ) {
    return false;
  }

  const lines = $getSoftLineSegments(paragraph);
  const lineIndex = $getSoftLineIndex(paragraph, selection.anchor);
  const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;

  if (targetIndex < 0 || targetIndex >= lines.length) {
    return false;
  }

  const { anchor, focus } = {
    anchor: $getOffsetWithinSoftLine(paragraph, selection.anchor, lineIndex),
    focus: $getOffsetWithinSoftLine(paragraph, selection.focus, lineIndex),
  };

  [lines[lineIndex], lines[targetIndex]] = [
    lines[targetIndex],
    lines[lineIndex],
  ];
  $replaceParagraphSoftLines(paragraph, lines);
  $restoreCaretInSoftLine(paragraph, targetIndex, anchor, focus);
  return true;
}

function $isWrapperListItem(listItem: ListItemNode): boolean {
  const children = listItem.getChildren();
  return children.length === 1 && $isListNode(children[0]);
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
          return point;
        }

        point.set(child.getKey(), 0, 'element');
        return point;
      }

      point.set(child.getKey(), flatOffset - childStart, 'text');
      return point;
    }

    offset += length;
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

function $isStructuralGapParagraph(node: LexicalNode): boolean {
  return $isEmptyLineParagraphNode(node) || $isTransientParagraphNode(node);
}

function $getPreviousContentSibling(node: ElementNode): ElementNode | null {
  let sibling = node.getPreviousSibling();

  while (
    sibling !== null &&
    $isElementNode(sibling) &&
    $isStructuralGapParagraph(sibling)
  ) {
    sibling = sibling.getPreviousSibling();
  }

  return $isElementNode(sibling) ? sibling : null;
}

function $getNextContentSibling(node: ElementNode): ElementNode | null {
  let sibling = node.getNextSibling();

  while (
    sibling !== null &&
    $isElementNode(sibling) &&
    $isStructuralGapParagraph(sibling)
  ) {
    sibling = sibling.getNextSibling();
  }

  return $isElementNode(sibling) ? sibling : null;
}

function $getMovableUnit(node: LexicalNode): ElementNode | null {
  if ($findMatchingParent(node, $isTableCellNode) !== null) {
    return null;
  }

  if ($findMatchingParent(node, $isCodeNode) !== null) {
    return null;
  }

  const listItem = $findMatchingParent(node, $isListItemNode);
  if (listItem !== null && !$isWrapperListItem(listItem)) {
    return listItem;
  }

  const quote = $findMatchingParent(node, $isQuoteNode);
  if (quote !== null) {
    let current: LexicalNode | null = node;
    while (current !== null && current.getParent() !== quote) {
      current = current.getParent();
    }

    if (current !== null && $isElementNode(current)) {
      return current;
    }
  }

  const topLevel = node.getTopLevelElement();
  if (topLevel === null || topLevel.getParent() !== $getRoot()) {
    return null;
  }

  if ($isStructuralGapParagraph(topLevel)) {
    return null;
  }

  return $isElementNode(topLevel) ? topLevel : null;
}

function $collectMovableUnits(selection: RangeSelection): ElementNode[] {
  const anchorUnit = $getMovableUnit(selection.anchor.getNode());
  const focusUnit = $getMovableUnit(selection.focus.getNode());

  if (anchorUnit === null || focusUnit === null) {
    return [];
  }

  if (anchorUnit === focusUnit) {
    return [anchorUnit];
  }

  const parent = anchorUnit.getParent();
  if (parent === null || parent !== focusUnit.getParent()) {
    return [anchorUnit];
  }

  const start = Math.min(
    anchorUnit.getIndexWithinParent(),
    focusUnit.getIndexWithinParent()
  );
  const end = Math.max(
    anchorUnit.getIndexWithinParent(),
    focusUnit.getIndexWithinParent()
  );

  return parent
    .getChildren()
    .slice(start, end + 1)
    .filter($isElementNode);
}

function $getMovableUnitsFromSelection(): ElementNode[] {
  const selection = $getSelection();

  if ($isNodeSelection(selection)) {
    return selection.getNodes().filter($isElementNode);
  }

  if (!$isRangeSelection(selection)) {
    return [];
  }

  if ($getCodeNodeFromSelection(selection) !== null) {
    return [];
  }

  return $collectMovableUnits(selection);
}

function $moveUnits(
  units: ElementNode[],
  direction: LineMoveDirection
): boolean {
  if (units.length === 0) {
    return false;
  }

  const selection = $getSelection();
  const savedOffsets =
    $isRangeSelection(selection) && units.length === 1
      ? $captureSelectionOffsetsInElement(units[0], selection)
      : null;

  const first = units[0];
  const last = units[units.length - 1];

  if (direction === 'up') {
    const previousContent = $getPreviousContentSibling(first);
    if (previousContent === null) {
      return false;
    }

    for (const unit of units) {
      unit.remove();
    }

    previousContent.insertBefore(units[0]);
    for (let index = 1; index < units.length; index++) {
      units[index - 1].insertAfter(units[index]);
    }
  } else {
    const nextContent = $getNextContentSibling(last);
    if (nextContent === null) {
      return false;
    }

    for (const unit of units) {
      unit.remove();
    }

    nextContent.insertAfter(units[units.length - 1]);
    for (let index = units.length - 2; index >= 0; index--) {
      units[index + 1].insertBefore(units[index]);
    }
  }

  if (savedOffsets) {
    $restoreCaretInElement(units[0], savedOffsets.anchor, savedOffsets.focus);
  } else {
    units[0].selectStart();
  }

  return true;
}

function $cloneLexicalNode(node: LexicalNode): LexicalNode {
  const clone = $copyNode(node);

  if ($isElementNode(node) && $isElementNode(clone)) {
    for (const child of node.getChildren()) {
      clone.append($cloneLexicalNode(child));
    }
  }

  return clone;
}

function $cloneElement(unit: ElementNode): ElementNode | null {
  if ($isStructuralGapParagraph(unit)) {
    return null;
  }

  const clone = $cloneLexicalNode(unit);
  return $isElementNode(clone) ? clone : null;
}

function $duplicateUnits(
  units: ElementNode[],
  direction: LineDuplicateDirection
): boolean {
  if (units.length === 0) {
    return false;
  }

  if (direction === 'up') {
    let anchor: ElementNode = units[0];
    for (const unit of [...units].reverse()) {
      const clone = $cloneElement(unit);
      if (clone === null) {
        continue;
      }

      anchor.insertBefore(clone);
      anchor = clone;
    }
  } else {
    let anchor: ElementNode = units[units.length - 1];
    for (const unit of units) {
      const clone = $cloneElement(unit);
      if (clone === null) {
        continue;
      }

      anchor.insertAfter(clone);
      anchor = clone;
    }
  }

  units[0].selectStart();
  return true;
}

function $getCodeLineBounds(
  text: string,
  rangeStart: number,
  rangeEnd: number
): { lineStart: number; lineEnd: number } {
  const lineStart = text.lastIndexOf('\n', rangeStart - 1) + 1;
  const nextNewline = text.indexOf('\n', rangeEnd);
  const lineEnd = nextNewline === -1 ? text.length : nextNewline;

  return { lineEnd, lineStart };
}

function $moveCodeLine(
  codeNode: CodeNode,
  selection: RangeSelection,
  direction: LineMoveDirection
): boolean {
  const text = codeNode.getTextContent();
  const [startPoint, endPoint] = selection.getStartEndPoints();
  const rangeStart = Math.min(
    $pointToCodeOffset(codeNode, startPoint),
    $pointToCodeOffset(codeNode, endPoint)
  );
  const rangeEnd = Math.max(
    $pointToCodeOffset(codeNode, startPoint),
    $pointToCodeOffset(codeNode, endPoint)
  );
  const { lineStart, lineEnd } = $getCodeLineBounds(text, rangeStart, rangeEnd);
  const line = text.slice(lineStart, lineEnd);

  if (direction === 'up') {
    if (lineStart === 0) {
      return false;
    }

    const previousLineStart = text.lastIndexOf('\n', lineStart - 2) + 1;
    const previousLine = text.slice(previousLineStart, lineStart - 1);
    const rest = lineEnd === text.length ? '' : `\n${text.slice(lineEnd + 1)}`;
    const newText = `${text.slice(0, previousLineStart)}${line}\n${previousLine}${rest}`;
    const cursorOffset = previousLineStart + (rangeStart - lineStart);

    $replaceCodeText(codeNode, newText);
    $setCodeSelectionOffsets(codeNode, cursorOffset, cursorOffset);
    return true;
  }

  if (lineEnd >= text.length) {
    return false;
  }

  const nextLineStart = lineEnd + 1;
  const nextLineEndIndex = text.indexOf('\n', nextLineStart);
  const nextLine =
    nextLineEndIndex === -1
      ? text.slice(nextLineStart)
      : text.slice(nextLineStart, nextLineEndIndex);
  const restAfterNext =
    nextLineEndIndex === -1 ? '' : `\n${text.slice(nextLineEndIndex + 1)}`;
  const newText = `${text.slice(0, lineStart)}${nextLine}\n${line}${restAfterNext}`;
  const cursorOffset =
    lineStart + nextLine.length + 1 + (rangeStart - lineStart);

  $replaceCodeText(codeNode, newText);
  $setCodeSelectionOffsets(codeNode, cursorOffset, cursorOffset);
  return true;
}

function $duplicateCodeLine(
  codeNode: CodeNode,
  selection: RangeSelection,
  direction: LineDuplicateDirection
): boolean {
  const text = codeNode.getTextContent();
  const [startPoint, endPoint] = selection.getStartEndPoints();
  const rangeStart = Math.min(
    $pointToCodeOffset(codeNode, startPoint),
    $pointToCodeOffset(codeNode, endPoint)
  );
  const rangeEnd = Math.max(
    $pointToCodeOffset(codeNode, startPoint),
    $pointToCodeOffset(codeNode, endPoint)
  );
  const { lineStart, lineEnd } = $getCodeLineBounds(text, rangeStart, rangeEnd);
  const line = text.slice(lineStart, lineEnd);

  if (direction === 'up') {
    const newText = `${text.slice(0, lineStart)}${line}\n${text.slice(lineStart)}`;
    const cursorOffset = rangeStart + line.length + 1;

    $replaceCodeText(codeNode, newText);
    $setCodeSelectionOffsets(codeNode, cursorOffset, cursorOffset);
    return true;
  }

  const insertAt = lineEnd === text.length ? text.length : lineEnd + 1;
  const newText = `${text.slice(0, insertAt)}\n${line}${text.slice(insertAt)}`;
  const cursorOffset = rangeStart;

  $replaceCodeText(codeNode, newText);
  $setCodeSelectionOffsets(codeNode, cursorOffset, cursorOffset);
  return true;
}

function $isAtLineMoveBoundary(
  selection: RangeSelection,
  rootBlock: ElementNode,
  direction: LineMoveDirection
): boolean {
  const traversalDirection = direction === 'up' ? 'backward' : 'forward';

  if (!selection.isCollapsed()) {
    const [startPoint, endPoint] = selection.getStartEndPoints();
    const point = direction === 'up' ? startPoint : endPoint;
    const boundarySelection = $createRangeSelection();
    boundarySelection.anchor.set(point.key, point.offset, point.type);
    boundarySelection.focus.set(point.key, point.offset, point.type);
    return $isAtBoundary(
      boundarySelection,
      rootBlock,
      traversalDirection,
      'vertical'
    );
  }

  return $isAtBoundary(selection, rootBlock, traversalDirection, 'vertical');
}

function $handleMoveLine(direction: LineMoveDirection): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return false;
  }

  const rootBlock = $getRootBlock(selection.anchor.getNode());

  if (rootBlock !== null && $isCodeNode(rootBlock)) {
    if (
      !$isAtLineMoveBoundary(selection, rootBlock, direction) &&
      $moveCodeLine(rootBlock, selection, direction)
    ) {
      return true;
    }
  } else if ($tryMoveIntraParagraphLine(selection, direction)) {
    return true;
  }

  if (
    rootBlock !== null &&
    $isAtLineMoveBoundary(selection, rootBlock, direction)
  ) {
    return $moveUnits([rootBlock], direction);
  }

  const units = $getMovableUnitsFromSelection();
  return $moveUnits(units, direction);
}

function $handleDuplicateLine(direction: LineDuplicateDirection): boolean {
  const selection = $getSelection();

  if ($isRangeSelection(selection)) {
    const codeNode = $getCodeNodeFromSelection(selection);
    if (codeNode !== null) {
      return $duplicateCodeLine(codeNode, selection, direction);
    }
  }

  const units = $getMovableUnitsFromSelection();
  return $duplicateUnits(units, direction);
}

const isCmdOrCtrl = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.ctrlKey !== event.metaKey;

const isAltOnly = (event: KeyboardEvent): boolean =>
  event.altKey && !event.shiftKey && !isCmdOrCtrl(event);

const isShiftAltOnly = (event: KeyboardEvent): boolean =>
  event.altKey && event.shiftKey && !isCmdOrCtrl(event);

function scrollSelectionIntoView(editor: LexicalEditor): void {
  const rootElement = editor.getRootElement();
  if (!rootElement) {
    return;
  }

  const scrollContainer = rootElement.closest('.lexical-md-editor-shell');
  if (!(scrollContainer instanceof HTMLElement)) {
    return;
  }

  requestAnimationFrame(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return;
      }

      const range = createDOMRange(
        editor,
        selection.anchor.getNode(),
        selection.anchor.offset,
        selection.focus.getNode(),
        selection.focus.offset
      );

      if (range) {
        scrollRangeIntoView(scrollContainer, range);
      }
    });
  });
}

export function registerLineShortcuts(editor: LexicalEditor): () => void {
  const handleMoveLine = (
    event: KeyboardEvent,
    direction: LineMoveDirection
  ): boolean => {
    if ($isSelectionInTable()) {
      return false;
    }

    const handled = $handleMoveLine(direction);
    if (handled) {
      event.preventDefault();
      scrollSelectionIntoView(editor);
    }
    return handled;
  };

  const handleDuplicateLine = (
    event: KeyboardEvent,
    direction: LineDuplicateDirection
  ): boolean => {
    if ($isSelectionInTable()) {
      return false;
    }

    const handled = $handleDuplicateLine(direction);
    if (handled) {
      event.preventDefault();
      scrollSelectionIntoView(editor);
    }
    return handled;
  };

  const handleArrowLineShortcut = (event: KeyboardEvent): boolean => {
    const key = event.key;
    if (key !== 'ArrowUp' && key !== 'ArrowDown') {
      return false;
    }

    const direction = key === 'ArrowUp' ? 'up' : 'down';

    if (isShiftAltOnly(event)) {
      return handleDuplicateLine(event, direction);
    }

    if (isAltOnly(event)) {
      return handleMoveLine(event, direction);
    }

    return false;
  };

  return mergeRegister(
    editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND,
      (event) => handleArrowLineShortcut(event),
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (!isAltOnly(event)) {
          return false;
        }

        return handleMoveLine(event, 'up');
      },
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (!isAltOnly(event)) {
          return false;
        }

        return handleMoveLine(event, 'down');
      },
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_UP_COMMAND,
      (event) => {
        if (!isShiftAltOnly(event)) {
          return false;
        }

        return handleDuplicateLine(event, 'up');
      },
      COMMAND_PRIORITY_CRITICAL
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        if (!isShiftAltOnly(event)) {
          return false;
        }

        return handleDuplicateLine(event, 'down');
      },
      COMMAND_PRIORITY_CRITICAL
    )
  );
}
