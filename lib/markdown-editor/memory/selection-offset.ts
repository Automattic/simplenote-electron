// Flat markdown character offsets for capture/restore via stored export coordinates.
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type PointType,
} from 'lexical';

import {
  $pointAtStoredMarkdownOffset,
  $storedMarkdownPrefixLength,
} from '../markdown/markdown-coordinates';

import {
  type MarkdownSelectionOffsets,
  remapMarkdownOffset,
  remapMarkdownSelectionOffsets,
} from './selection-diff';

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

  return $storedMarkdownPrefixLength(to);
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
  const anchor = $pointAtStoredMarkdownOffset(saved.anchor);
  const focus = $pointAtStoredMarkdownOffset(saved.focus);
  if (!anchor || !focus) {
    return false;
  }

  const selection = $createRangeSelection();
  selection.anchor.set(anchor.key, anchor.offset, 'text');
  selection.focus.set(focus.key, focus.offset, 'text');
  $setSelection(selection);
  return true;
}
