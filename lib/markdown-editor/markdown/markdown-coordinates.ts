import { $convertSelectionToMarkdownString } from '@lexical/markdown';
import { $isHorizontalRuleNode } from '@lexical/extension';
import {
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalNode,
  type PointType,
} from 'lexical';

import { separatorBetweenRootBlocks } from './block-gaps';
import { $exportElementInlineMarkdownPrefix } from './gfm-inline-export';
import {
  $exportStoredTopLevelBlockMarkdown,
  getStoredContentRootBlocks,
} from './markdown-export';
import { MARKDOWN_TRANSFORMERS } from './transformers';

type DocumentPoint = {
  key: string;
  offset: number;
  type: 'text' | 'element';
};

function blockContainsPoint(
  block: LexicalNode,
  point: PointType | DocumentPoint
): boolean {
  if (point.key === block.getKey()) {
    return true;
  }

  const pointNode = $getNodeByKey(point.key);
  if (pointNode === null) {
    return false;
  }

  return block.isParentOf(pointNode);
}

function exportPartialStoredTopLevelBlock(
  block: LexicalNode,
  point: PointType | DocumentPoint
): string {
  if ($isHorizontalRuleNode(block)) {
    return $exportStoredTopLevelBlockMarkdown(block);
  }

  if ($isParagraphNode(block)) {
    return $exportElementInlineMarkdownPrefix(block, point, {
      reimportLineBreaks: false,
    });
  }

  const selection = $createRangeSelection();
  selection.anchor.set(block.getKey(), 0, 'element');
  selection.focus.set(point.key, point.offset, point.type);
  return $convertSelectionToMarkdownString(
    MARKDOWN_TRANSFORMERS,
    selection
  ).replace(/^\n+/, '');
}

/** Stored-markdown prefix from document start through `point`. */
export function $exportStoredMarkdownPrefixToPoint(
  point: PointType | DocumentPoint
): string {
  let output = '';
  let previousBlock: LexicalNode | null = null;

  for (const child of getStoredContentRootBlocks()) {
    const markdown = $exportStoredTopLevelBlockMarkdown(child);
    if (markdown.length === 0) {
      continue;
    }

    if (blockContainsPoint(child, point)) {
      if (output.length > 0 && previousBlock !== null) {
        output += separatorBetweenRootBlocks(previousBlock, child);
      }
      output += exportPartialStoredTopLevelBlock(child, point);
      return output;
    }

    if (output.length > 0 && previousBlock !== null) {
      output += separatorBetweenRootBlocks(previousBlock, child);
    }

    output += markdown;
    previousBlock = child;
  }

  return output;
}

export function $storedMarkdownPrefixLength(
  point: PointType | DocumentPoint
): number {
  return $exportStoredMarkdownPrefixToPoint(point).length;
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
    const prefixLength = $storedMarkdownPrefixLength({
      key: points[mid].key,
      offset: points[mid].offset,
      type: 'text',
    });
    if (prefixLength <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  const point = points[lo];
  if (
    $storedMarkdownPrefixLength({
      key: point.key,
      offset: point.offset,
      type: 'text',
    }) !== offset
  ) {
    return null;
  }

  return point;
}

/** Map a stored-markdown offset back to a text point in the editor. */
export function $pointAtStoredMarkdownOffset(
  offset: number
): { key: string; offset: number } | null {
  let pos = 0;
  let previousBlock: LexicalNode | null = null;

  for (const child of getStoredContentRootBlocks()) {
    const blockMarkdown = $exportStoredTopLevelBlockMarkdown(child);
    if (blockMarkdown.length === 0) {
      continue;
    }

    if (previousBlock !== null) {
      const separator = separatorBetweenRootBlocks(previousBlock, child);
      if (offset < pos + separator.length) {
        return $pointAtEndOfBlock(previousBlock);
      }
      pos += separator.length;
    }

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
