import { $convertSelectionToMarkdownString } from '@lexical/markdown';
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
  remapOffsetThroughStringDiff,
  remapOffsetsThroughStringDiff,
  type TextEditOp,
} from '../utils/remap-selection-offset';

import { MARKDOWN_TRANSFORMERS } from './transformers';

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

export type { TextEditOp };

export function remapMarkdownOffset(
  local: string,
  remote: string,
  offset: number
): number {
  return remapOffsetThroughStringDiff(local, remote, offset);
}

export function remapMarkdownSelectionOffsets(
  local: string,
  remote: string,
  saved: MarkdownSelectionOffsets
): MarkdownSelectionOffsets {
  const [anchor, focus] = remapOffsetsThroughStringDiff(
    local,
    remote,
    saved.anchor,
    saved.focus
  );

  return {
    anchor,
    focus,
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

function $pointAtMarkdownOffset(
  offset: number
): { key: string; offset: number } | null {
  let best: { key: string; offset: number } | null = null;
  let bestLength = -1;

  $forEachTextPoint((key, textOffset) => {
    const length = $markdownPrefixLength({
      key,
      offset: textOffset,
      type: 'text',
    });
    if (length <= offset && length > bestLength) {
      bestLength = length;
      best = { key, offset: textOffset };
    }
  });

  return best;
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
