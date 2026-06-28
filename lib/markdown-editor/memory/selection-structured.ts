// Structured selection uses { rootIndex, path, textOffset } tree coordinates.
// Remap runs when markdown changed between capture and restore (remote sync);
// note-switch restore uses the same path when localMarkdown matches.
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';
import {
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type ElementNode,
  type LexicalNode,
  type PointType,
  type TextNode,
} from 'lexical';

import { $selectTransientGapAfterExportRootIndex } from '../extensions/block-cursor-navigation';
import { isEmptyRootParagraph } from '../markdown/block-gaps';
import { getContentRootBlocks } from '../markdown/markdown-export';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

import { remapMarkdownOffset } from './selection-diff';

export type StructuredPoint = {
  rootIndex: number;
  path: number[];
  textOffset: number;
  /** Caret in a transient gap after export-root block at this index. */
  transientGapAfterRootIndex?: number;
};

export type StructuredSelection = {
  anchor: StructuredPoint;
  focus: StructuredPoint;
  direction: 'LTR' | 'RTL';
};

function clampIndex(index: number, size: number): number {
  if (size <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(index, size - 1));
}

function childAt(parent: ElementNode, index: number): LexicalNode | null {
  if (index < 0 || index >= parent.getChildrenSize()) {
    return null;
  }
  return parent.getChildAtIndex(index) ?? null;
}

function findFirstTextDescendant(node: LexicalNode): TextNode | null {
  if ($isTextNode(node)) {
    return node;
  }
  if (!$isElementNode(node)) {
    return null;
  }
  for (const child of node.getChildren()) {
    const text = findFirstTextDescendant(child);
    if (text !== null) {
      return text;
    }
  }
  return null;
}

function $textNodeAndOffset(
  point: PointType
): { node: TextNode; offset: number } | null {
  const node = point.getNode();
  if ($isTextNode(node)) {
    return { node, offset: point.offset };
  }
  if ($isElementNode(node)) {
    const text = findFirstTextDescendant(node);
    if (text !== null) {
      return { node: text, offset: point.offset };
    }
  }
  return null;
}

function $topLevelRootChild(node: LexicalNode): LexicalNode | null {
  let current: LexicalNode | null = node;
  while (
    current !== null &&
    current.getParent()?.getKey() !== $getRoot().getKey()
  ) {
    current = current.getParent();
  }
  return current;
}

function $ensureParagraphTextNode(paragraph: ElementNode): TextNode {
  const first = paragraph.getFirstChild();
  if ($isTextNode(first)) {
    return first;
  }

  const text = $createTextNode('');
  paragraph.append(text);
  return text;
}

function $captureStructuredPoint(point: PointType): StructuredPoint | null {
  const top = $topLevelRootChild(point.getNode());
  if (top === null) {
    return null;
  }

  if ($isTransientParagraphNode(top)) {
    let previous = top.getPreviousSibling();
    while (previous !== null && $isTransientParagraphNode(previous)) {
      previous = previous.getPreviousSibling();
    }
    if (previous === null || $isTransientParagraphNode(previous)) {
      return null;
    }

    const rootChildren = getContentRootBlocks();
    const afterIndex = rootChildren.findIndex(
      (child) => child.getKey() === previous.getKey()
    );
    if (afterIndex < 0) {
      return null;
    }

    const resolved = $textNodeAndOffset(point);
    return {
      rootIndex: afterIndex,
      path: [],
      textOffset: resolved?.offset ?? 0,
      transientGapAfterRootIndex: afterIndex,
    };
  }

  if (isEmptyRootParagraph(top)) {
    const rootChildren = getContentRootBlocks();
    const rootIndex = rootChildren.findIndex(
      (child) => child.getKey() === top.getKey()
    );
    if (rootIndex < 0) {
      return null;
    }

    return {
      rootIndex,
      path: [],
      textOffset: 0,
    };
  }

  const resolved = $textNodeAndOffset(point);
  if (resolved === null) {
    return null;
  }

  const path: number[] = [];
  let current: LexicalNode = resolved.node;

  while (current.getParent()?.getKey() !== $getRoot().getKey()) {
    const parent = current.getParent();
    if (parent === null) {
      return null;
    }
    path.unshift(current.getIndexWithinParent());
    current = parent;
  }

  const rootChildren = getContentRootBlocks();
  const rootIndex = rootChildren.findIndex(
    (child) => child.getKey() === current.getKey()
  );
  if (rootIndex < 0) {
    return null;
  }

  return {
    rootIndex,
    path,
    textOffset: resolved.offset,
  };
}

export function $captureStructuredSelection(): StructuredSelection | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchor = $captureStructuredPoint(selection.anchor);
  const focus = $captureStructuredPoint(selection.focus);
  if (anchor === null || focus === null) {
    return null;
  }

  return {
    anchor,
    focus,
    direction: selection.isBackward() ? 'RTL' : 'LTR',
  };
}

function containerTextFromBlock(
  block: LexicalNode,
  point: StructuredPoint
): string | null {
  if ($isTableNode(block) && point.path.length >= 2) {
    const row = block.getChildAtIndex(point.path[0]);
    if (!$isTableRowNode(row)) {
      return null;
    }
    const cell = row.getChildAtIndex(point.path[1]);
    if (!$isTableCellNode(cell)) {
      return null;
    }
    return cell.getTextContent();
  }

  return block.getTextContent();
}

export function getContainerTextFromLexical(
  point: StructuredPoint
): string | null {
  if (point.transientGapAfterRootIndex !== undefined) {
    return '';
  }

  const rootChildren = getContentRootBlocks();
  if (point.rootIndex < 0 || point.rootIndex >= rootChildren.length) {
    return null;
  }

  return containerTextFromBlock(rootChildren[point.rootIndex], point);
}

export function getContainerTextFromParsedBlocks(
  blocks: LexicalNode[],
  point: StructuredPoint
): string | null {
  if (blocks.length === 0) {
    return null;
  }

  if (point.rootIndex < 0 || point.rootIndex >= blocks.length) {
    return null;
  }

  return containerTextFromBlock(blocks[point.rootIndex], point);
}

function $resolveStructuredPoint(
  point: StructuredPoint
): { key: string; offset: number } | null {
  if (point.transientGapAfterRootIndex !== undefined) {
    return $selectTransientGapAfterExportRootIndex(
      point.transientGapAfterRootIndex,
      point.textOffset
    );
  }

  const rootChildren = getContentRootBlocks();
  if (rootChildren.length === 0) {
    return null;
  }

  let current = rootChildren[clampIndex(point.rootIndex, rootChildren.length)];
  if (current === undefined) {
    return null;
  }

  if (point.path.length === 0 && isEmptyRootParagraph(current)) {
    const text = $ensureParagraphTextNode(current);
    return {
      key: text.getKey(),
      offset: clampIndex(point.textOffset, text.getTextContentSize() + 1),
    };
  }

  const path = [...point.path];
  if ($isTableNode(current) && path.length >= 2) {
    path[0] = clampIndex(path[0], current.getChildrenSize());
    const row = childAt(current, path[0]);
    if (row === null || !$isTableRowNode(row)) {
      return null;
    }
    path[1] = clampIndex(path[1], row.getChildrenSize());
  }

  for (const index of path) {
    if (!$isElementNode(current)) {
      return null;
    }
    const child = childAt(
      current,
      clampIndex(index, current.getChildrenSize())
    );
    if (child === null) {
      return null;
    }
    current = child;
  }

  if (!$isTextNode(current)) {
    const text = findFirstTextDescendant(current);
    if (text === null) {
      return null;
    }
    current = text;
  }

  return {
    key: current.getKey(),
    offset: clampIndex(point.textOffset, current.getTextContentSize() + 1),
  };
}

export function $restoreStructuredSelection(
  saved: StructuredSelection
): boolean {
  const anchor = $resolveStructuredPoint(saved.anchor);
  const focus = $resolveStructuredPoint(saved.focus);
  if (anchor === null || focus === null) {
    return false;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(anchor.key, anchor.offset, 'text');
  selection.focus.set(focus.key, focus.offset, 'text');
  $setSelection(selection);
  return true;
}

export function remapStructuredPoint(
  localText: string | null,
  remoteText: string | null,
  point: StructuredPoint
): StructuredPoint {
  if (point.transientGapAfterRootIndex !== undefined) {
    return point;
  }

  if (localText === null || remoteText === null || localText === remoteText) {
    return point;
  }

  return {
    ...point,
    textOffset: remapMarkdownOffset(localText, remoteText, point.textOffset),
  };
}
