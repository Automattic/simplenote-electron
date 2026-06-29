import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';

import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';
import { $isEmptyLineParagraphNode } from '../nodes/empty-line-paragraph-node';

export function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isElementNode(node) &&
    node.getType() === 'paragraph' &&
    !$isTransientParagraphNode(node) &&
    !$isEmptyLineParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

export function isEmptyLineParagraph(node: LexicalNode): boolean {
  return $isEmptyLineParagraphNode(node);
}

export function $exportRootChildren(): LexicalNode[] {
  return $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
}
