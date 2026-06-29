import { $isHorizontalRuleNode } from '@lexical/extension';
import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode } from '@lexical/table';
import type { LexicalNode } from 'lexical';

export function gapForEmptyParagraphCount(emptyCount: number): string {
  if (emptyCount <= 0) {
    return '';
  }
  // N empty root paragraphs need (N + 2) newlines: one \n\n block separator plus
  // (N - 1) extra newlines per empty line, i.e. \n\n\n for one empty line.
  return '\n'.repeat(emptyCount + 2);
}

/** Blocks that round-trip with a single newline after a horizontal rule. */
export function blocksCoalesceOnSingleNewline(
  previousBlock: LexicalNode,
  _nextBlock: LexicalNode
): boolean {
  return $isHorizontalRuleNode(previousBlock);
}

/** Root blocks that need an explicit blank line so import does not merge them. */
export function blocksNeedBlankLineBetween(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode
): boolean {
  if ($isTableNode(previousBlock) && $isTableNode(nextBlock)) {
    return true;
  }

  return $isQuoteNode(previousBlock) && $isQuoteNode(nextBlock);
}

export function blockSeparatorForExport(
  previousBlock: LexicalNode,
  nextBlock: LexicalNode,
  pendingEmpty: number
): string {
  if (pendingEmpty > 0) {
    return gapForEmptyParagraphCount(pendingEmpty);
  }

  if (blocksCoalesceOnSingleNewline(previousBlock, nextBlock)) {
    return '\n';
  }

  return '\n\n';
}
