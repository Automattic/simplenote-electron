// Flat markdown character offsets for capture/restore via export transformers.
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalNode,
  type PointType,
} from 'lexical';

import {
  $exportBlockMarkdown,
  $exportSelectionToMarkdown,
} from '../markdown/import-export';
import { MARKDOWN_TRANSFORMERS } from '../markdown/transformers';
import {
  blockSeparatorForExport,
  gapForEmptyParagraphCount,
} from '../markdown/block-separator-export';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

import {
  type MarkdownSelectionOffsets,
  remapMarkdownOffset,
  remapMarkdownSelectionOffsets,
} from './selection-diff';
import { isEmptyRootParagraph } from './selection-lexical-helpers';

export type { MarkdownSelectionOffsets };
export {
  remapMarkdownOffset,
  remapMarkdownSelectionOffsets,
  diffMarkdownToOps,
} from './selection-diff';

type DocumentPoint = {
  key: string;
  offset: number;
  type: 'text' | 'element';
};

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
  return $exportSelectionToMarkdown(selection, MARKDOWN_TRANSFORMERS).length;
}

function $markdownPrefixLengthAtTextPoint(key: string, offset: number): number {
  return $markdownPrefixLength({ key, offset, type: 'text' });
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

function exportRootChildMarkdown(node: LexicalNode): string {
  return $exportBlockMarkdown(node);
}

function $pointAtMarkdownOffsetFromTextPoints(
  offset: number
): { key: string; offset: number } | null {
  const points: Array<{ key: string; offset: number }> = [];
  $forEachTextPoint((key, textOffset) => {
    points.push({ key, offset: textOffset });
  });
  if (points.length === 0) {
    return null;
  }

  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (
      $markdownPrefixLengthAtTextPoint(points[mid].key, points[mid].offset) <=
      offset
    ) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const point = points[lo];
  if ($markdownPrefixLengthAtTextPoint(point.key, point.offset) !== offset) {
    return null;
  }

  return point;
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
        return $pointAtMarkdownOffsetFromTextPoints(offset);
      }
      pos += gap.length;
    }

    pendingEmpty = 0;

    if (offset <= pos + blockMarkdown.length) {
      return $pointAtMarkdownOffsetFromTextPoints(offset);
    }

    pos += blockMarkdown.length;
    previousBlock = child;
  }

  if (previousBlock !== null && offset === pos) {
    return $pointAtEndOfBlock(previousBlock);
  }

  return $pointAtMarkdownOffsetFromTextPoints(offset);
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
