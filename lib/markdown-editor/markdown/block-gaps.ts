import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isCodeNode } from '@lexical/code-core';
import { $isListNode } from '@lexical/list';
import { $isHeadingNode, $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode } from '@lexical/table';
import {
  $getNodeByKey,
  $isParagraphNode,
  type LexicalNode,
  type NodeKey,
} from 'lexical';

import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

/** GFM hard line break: two trailing spaces before newline. */
export const GFM_HARD_LINE_BREAK = '  \n';

/** Standard paragraph / merge-sensitive block boundary in stored markdown. */
export const GFM_PARAGRAPH_GAP = '\n\n';

/** Minimum unambiguous block boundary when the next line starts a new block type. */
export const MIN_BLOCK_GAP = '\n';

export function gapNewlineCount(gap: string): number {
  return (gap.match(/\n/g) || []).length;
}

export function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isParagraphNode(node) &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

function isPlainContentParagraph(node: LexicalNode): boolean {
  return $isParagraphNode(node) && !isEmptyRootParagraph(node);
}

type RootBlockKind =
  | 'code'
  | 'heading'
  | 'hr'
  | 'list'
  | 'other'
  | 'paragraph'
  | 'quote'
  | 'table';

function rootBlockKind(node: LexicalNode): RootBlockKind {
  if ($isHorizontalRuleNode(node)) {
    return 'hr';
  }
  if ($isListNode(node)) {
    return 'list';
  }
  if ($isTableNode(node)) {
    return 'table';
  }
  if ($isQuoteNode(node)) {
    return 'quote';
  }
  if ($isHeadingNode(node)) {
    return 'heading';
  }
  if ($isCodeNode(node)) {
    return 'code';
  }
  if (isPlainContentParagraph(node)) {
    return 'paragraph';
  }
  return 'other';
}

/** Root blocks that need `\n\n` between them on export. */
export function blocksNeedBlankLineBetween(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode
): boolean {
  if ($isTableNode(previousBlock) && $isTableNode(nextBlock)) {
    return true;
  }

  return $isQuoteNode(previousBlock) && $isQuoteNode(nextBlock);
}

/** Default markdown gap between two exported root blocks (no imported gap metadata). */
export function blockSeparatorForExport(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode
): string {
  const previousKind = rootBlockKind(previousBlock);
  const nextKind = rootBlockKind(nextBlock);

  if (previousKind === 'paragraph' && nextKind === 'paragraph') {
    return GFM_PARAGRAPH_GAP;
  }

  if (blocksNeedBlankLineBetween(previousBlock, nextBlock)) {
    return GFM_PARAGRAPH_GAP;
  }

  if (previousKind === 'list') {
    return GFM_PARAGRAPH_GAP;
  }

  if (nextKind === 'table') {
    return GFM_PARAGRAPH_GAP;
  }

  if (previousKind === 'paragraph' && nextKind === 'list') {
    return GFM_PARAGRAPH_GAP;
  }

  if (previousKind === 'hr') {
    return nextKind === 'heading' ? MIN_BLOCK_GAP : GFM_PARAGRAPH_GAP;
  }

  return MIN_BLOCK_GAP;
}

const gapBeforeBlock = new WeakMap<LexicalNode, number>();

export function setBlockGapBefore(
  block: LexicalNode,
  newlineCount: number
): void {
  if (newlineCount >= 2) {
    gapBeforeBlock.set(block, newlineCount);
  }
}

export function getBlockGapBefore(block: LexicalNode): number | undefined {
  return gapBeforeBlock.get(block);
}

export function clearBlockGapBefore(block: LexicalNode): void {
  gapBeforeBlock.delete(block);
}

export function clearBlockGapsForReExport(
  blockKey: NodeKey,
  rootChildKeys: readonly NodeKey[]
): void {
  const block = $getNodeByKey(blockKey);
  if (block !== null) {
    clearBlockGapBefore(block);
  }

  const index = rootChildKeys.indexOf(blockKey);
  if (index >= 0 && index < rootChildKeys.length - 1) {
    const nextBlock = $getNodeByKey(rootChildKeys[index + 1]);
    if (nextBlock !== null) {
      clearBlockGapBefore(nextBlock);
    }
  }
}

/** Previous root content block, skipping structural transient paragraphs. */
export function previousContentRootBlock(
  node: LexicalNode
): LexicalNode | null {
  let previous = node.getPreviousSibling();
  while (previous !== null && $isTransientParagraphNode(previous)) {
    previous = previous.getPreviousSibling();
  }
  return previous;
}

/**
 * When import saw more newlines before a block than export would normally emit,
 * store the source gap on the block for round-trip until it is edited.
 */
export function recordImportedGapBefore(
  nextBlock: LexicalNode,
  newlineCount: number
): void {
  if (newlineCount < 2) {
    return;
  }

  const previousBlock = previousContentRootBlock(nextBlock);
  const defaultGap =
    previousBlock === null
      ? MIN_BLOCK_GAP
      : blockSeparatorForExport(previousBlock, nextBlock);

  if (newlineCount > gapNewlineCount(defaultGap)) {
    setBlockGapBefore(nextBlock, newlineCount);
  }
}

/** Markdown gap between two root blocks, honoring imported legacy width when set. */
export function separatorBetweenRootBlocks(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode
): string {
  const stored = getBlockGapBefore(nextBlock);
  if (stored !== undefined) {
    return '\n'.repeat(stored);
  }

  return blockSeparatorForExport(previousBlock, nextBlock);
}
