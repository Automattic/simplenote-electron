import { $convertSelectionToMarkdownString } from '@lexical/markdown';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';
import {
  $createRangeSelection,
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

import { MARKDOWN_TRANSFORMERS } from './transformers';
import {
  blockSeparatorForExport,
  gapForEmptyParagraphCount,
} from './block-separator-export';
import { $isTransientParagraphNode } from './transient-paragraph-node';

export type MarkdownSelectionOffsets = {
  anchor: number;
  focus: number;
  direction: 'LTR' | 'RTL';
};

type DocumentPoint = {
  key: string;
  offset: number;
  type: 'text' | 'element';
};

type DiffOp =
  | { kind: 'equal'; length: number }
  | { kind: 'delete'; length: number }
  | { kind: 'insert'; text: string };

const MAX_LCS_CHARS = 4096;

function diffMiddle(local: string, remote: string): DiffOp[] {
  if (local === remote) {
    return [];
  }
  if (local.length === 0) {
    return [{ kind: 'insert', text: remote }];
  }
  if (remote.length === 0) {
    return [{ kind: 'delete', length: local.length }];
  }
  if (remote.endsWith(local)) {
    const inserted = remote.slice(0, remote.length - local.length);
    return inserted.length > 0
      ? [
          { kind: 'insert', text: inserted },
          { kind: 'equal', length: local.length },
        ]
      : [{ kind: 'equal', length: local.length }];
  }
  if (local.endsWith(remote)) {
    const removed = local.slice(0, local.length - remote.length);
    return removed.length > 0
      ? [
          { kind: 'delete', length: removed.length },
          { kind: 'equal', length: remote.length },
        ]
      : [{ kind: 'equal', length: remote.length }];
  }
  if (local.length + remote.length <= MAX_LCS_CHARS) {
    return lcsDiffOps(local, remote);
  }

  return [
    { kind: 'delete', length: local.length },
    { kind: 'insert', text: remote },
  ];
}

function lcsDiffOps(local: string, remote: string): DiffOp[] {
  const rows = local.length + 1;
  const cols = remote.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      dp[i][j] =
        local[i - 1] === remote[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = local.length;
  let j = remote.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
      let length = 0;
      while (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
        length++;
        i--;
        j--;
      }
      ops.push({ kind: 'equal', length });
      continue;
    }

    if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      let text = '';
      while (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        if (i > 0 && local[i - 1] === remote[j - 1]) {
          break;
        }
        text = remote[j - 1] + text;
        j--;
      }
      ops.push({ kind: 'insert', text });
      continue;
    }

    let length = 0;
    while (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
      if (j > 0 && local[i - 1] === remote[j - 1]) {
        break;
      }
      length++;
      i--;
    }
    ops.push({ kind: 'delete', length });
  }

  return mergeDiffOps(ops.reverse());
}

function mergeDiffOps(ops: DiffOp[]): DiffOp[] {
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.kind === op.kind) {
      if (last.kind === 'equal' && op.kind === 'equal') {
        last.length += op.length;
      } else if (last.kind === 'delete' && op.kind === 'delete') {
        last.length += op.length;
      } else if (last.kind === 'insert' && op.kind === 'insert') {
        last.text += op.text;
      }
      continue;
    }
    merged.push({ ...op });
  }
  return merged;
}

export function diffMarkdownToOps(local: string, remote: string): DiffOp[] {
  if (local === remote) {
    return [];
  }

  let prefix = 0;
  while (
    prefix < local.length &&
    prefix < remote.length &&
    local[prefix] === remote[prefix]
  ) {
    prefix++;
  }

  let suffix = 0;
  while (
    suffix < local.length - prefix &&
    suffix < remote.length - prefix &&
    local[local.length - 1 - suffix] === remote[remote.length - 1 - suffix]
  ) {
    suffix++;
  }

  const ops: DiffOp[] = [];
  if (prefix > 0) {
    ops.push({ kind: 'equal', length: prefix });
  }

  const localMiddle = local.slice(prefix, local.length - suffix);
  const remoteMiddle = remote.slice(prefix, remote.length - suffix);
  ops.push(...diffMiddle(localMiddle, remoteMiddle));

  if (suffix > 0) {
    ops.push({ kind: 'equal', length: suffix });
  }

  return mergeDiffOps(ops);
}

export function remapMarkdownOffset(
  local: string,
  remote: string,
  offset: number
): number {
  if (local === remote) {
    return offset;
  }

  const target = Math.max(0, Math.min(offset, local.length));
  const ops = diffMarkdownToOps(local, remote);
  let localIndex = 0;
  let remoteIndex = 0;

  for (const op of ops) {
    switch (op.kind) {
      case 'equal': {
        if (target <= localIndex + op.length) {
          return remoteIndex + (target - localIndex);
        }
        localIndex += op.length;
        remoteIndex += op.length;
        break;
      }
      case 'delete': {
        if (target <= localIndex + op.length) {
          return remoteIndex;
        }
        localIndex += op.length;
        break;
      }
      case 'insert': {
        remoteIndex += op.text.length;
        break;
      }
    }
  }

  return remoteIndex;
}

export function remapMarkdownSelectionOffsets(
  local: string,
  remote: string,
  saved: MarkdownSelectionOffsets
): MarkdownSelectionOffsets {
  return {
    anchor: remapMarkdownOffset(local, remote, saved.anchor),
    focus: remapMarkdownOffset(local, remote, saved.focus),
    direction: saved.direction,
  };
}

function $documentStart(): DocumentPoint {
  const root = $getRoot();
  const first = root.getFirstDescendant();
  if ($isTextNode(first)) {
    return { key: first.getKey(), offset: 0, type: 'text' };
  }
  if ($isElementNode(first)) {
    return { key: first.getKey(), offset: 0, type: 'element' };
  }
  return { key: root.getKey(), offset: 0, type: 'element' };
}

function $markdownPrefixLength(to: PointType | DocumentPoint): number {
  const start = $documentStart();
  if (
    start.key === to.key &&
    start.offset === to.offset &&
    start.type === to.type
  ) {
    return 0;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(start.key, start.offset, start.type);
  selection.focus.set(to.key, to.offset, to.type);
  return $convertSelectionToMarkdownString(MARKDOWN_TRANSFORMERS, selection)
    .length;
}

function $forEachTextPoint(visit: (key: string, offset: number) => void): void {
  const walk = (node: LexicalNode) => {
    if ($isTextNode(node)) {
      for (let offset = 0; offset <= node.getTextContentSize(); offset++) {
        visit(node.getKey(), offset);
      }
      return;
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
}

function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isElementNode(node) &&
    node.getType() === 'paragraph' &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

function exportRootChildMarkdown(node: LexicalNode): string {
  if (!$isElementNode(node)) {
    return node.getTextContent();
  }

  const selection = $createRangeSelection();
  const key = node.getKey();
  selection.anchor.set(key, 0, 'element');
  selection.focus.set(key, node.getChildrenSize(), 'element');

  return $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');
}

function $markdownPrefixLengthWithinBlock(
  block: LexicalNode,
  to: { key: string; offset: number }
): number {
  if (!$isElementNode(block)) {
    return 0;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(block.getKey(), 0, 'element');
  selection.focus.set(to.key, to.offset, 'text');
  return $convertSelectionToMarkdownString(MARKDOWN_TRANSFORMERS, selection)
    .length;
}

function collectTextPointsInBlock(
  block: LexicalNode,
  points: Array<{ key: string; offset: number }>
): void {
  const walk = (node: LexicalNode) => {
    if ($isTextNode(node)) {
      for (let offset = 0; offset <= node.getTextContentSize(); offset++) {
        points.push({ key: node.getKey(), offset });
      }
      return;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) {
        walk(child);
      }
    }
  };

  walk(block);
}

function $pointAtMarkdownOffsetInBlock(
  block: LexicalNode,
  offsetInBlock: number
): { key: string; offset: number } | null {
  const points: Array<{ key: string; offset: number }> = [];
  collectTextPointsInBlock(block, points);
  if (points.length === 0) {
    return null;
  }

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const length = $markdownPrefixLengthWithinBlock(block, points[mid]);
    if (length <= offsetInBlock) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return points[lo];
}

function $pointAtEndOfBlock(
  block: LexicalNode
): { key: string; offset: number } | null {
  const points: Array<{ key: string; offset: number }> = [];
  collectTextPointsInBlock(block, points);
  return points[points.length - 1] ?? null;
}

function $pointAtMarkdownOffset(
  offset: number
): { key: string; offset: number } | null {
  const children = $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
  let pos = 0;
  let pendingEmpty = 0;
  let previousBlock: LexicalNode | null = null;

  for (const child of children) {
    if (isEmptyRootParagraph(child)) {
      pendingEmpty++;
      continue;
    }

    const blockMarkdown = exportRootChildMarkdown(child);
    if (blockMarkdown.length === 0) {
      continue;
    }

    if (previousBlock !== null) {
      const separator = blockSeparatorForExport(
        previousBlock,
        child,
        pendingEmpty
      );
      if (offset < pos + separator.length) {
        return $pointAtEndOfBlock(previousBlock);
      }
      pos += separator.length;
    } else if (pendingEmpty > 0) {
      const gap = gapForEmptyParagraphCount(pendingEmpty);
      if (offset < pos + gap.length) {
        return $pointAtMarkdownOffsetInBlock(child, 0);
      }
      pos += gap.length;
    }

    pendingEmpty = 0;

    if (offset <= pos + blockMarkdown.length) {
      return $pointAtMarkdownOffsetInBlock(child, offset - pos);
    }

    pos += blockMarkdown.length;
    previousBlock = child;
  }

  if (previousBlock !== null && offset === pos) {
    return $pointAtEndOfBlock(previousBlock);
  }

  return null;
}

export function $captureMarkdownSelectionOffsets(): MarkdownSelectionOffsets | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return null;
  }

  return {
    anchor: $markdownPrefixLength(selection.anchor),
    focus: $markdownPrefixLength(selection.focus),
    direction: selection.isBackward() ? 'RTL' : 'LTR',
  };
}

export function $restoreMarkdownSelectionOffsets(
  saved: MarkdownSelectionOffsets
): boolean {
  const anchor = $pointAtMarkdownOffset(saved.anchor);
  const focus = $pointAtMarkdownOffset(saved.focus);
  if (!anchor || !focus) {
    return false;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(anchor.key, anchor.offset, 'text');
  selection.focus.set(focus.key, focus.offset, 'text');
  $setSelection(selection);
  return true;
}

export type StructuredPoint = {
  rootIndex: number;
  path: number[];
  textOffset: number;
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

function $exportRootChildren(): LexicalNode[] {
  return $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
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

function $captureStructuredPoint(point: PointType): StructuredPoint | null {
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

  const rootChildren = $exportRootChildren();
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
  const rootChildren = $exportRootChildren();
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
  const rootChildren = $exportRootChildren();
  if (rootChildren.length === 0) {
    return null;
  }

  let current = rootChildren[clampIndex(point.rootIndex, rootChildren.length)];
  if (current === undefined) {
    return null;
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
  if (localText === null || remoteText === null || localText === remoteText) {
    return point;
  }

  return {
    ...point,
    textOffset: remapMarkdownOffset(localText, remoteText, point.textOffset),
  };
}
