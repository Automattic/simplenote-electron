import { $isQuoteNode } from '@lexical/rich-text';
import { $isTableNode } from '@lexical/table';
import { $isParagraphNode, type LexicalNode } from 'lexical';

import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

export function gapForEmptyParagraphCount(emptyCount: number): string {
  if (emptyCount <= 0) {
    return '';
  }
  return '\n'.repeat(emptyCount + 1);
}

function isEmptyRootParagraph(node: LexicalNode): boolean {
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

/** Root blocks that coalesce on import when separated by only a single newline. */
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

  if (
    isPlainContentParagraph(previousBlock) &&
    isPlainContentParagraph(nextBlock)
  ) {
    return gapForEmptyParagraphCount(1);
  }

  if (blocksNeedBlankLineBetween(previousBlock, nextBlock)) {
    return gapForEmptyParagraphCount(1);
  }

  return '\n';
}
