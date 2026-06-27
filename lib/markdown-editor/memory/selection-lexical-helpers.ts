import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';

import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';

export function isEmptyRootParagraph(node: LexicalNode): boolean {
  return (
    $isElementNode(node) &&
    node.getType() === 'paragraph' &&
    !$isTransientParagraphNode(node) &&
    node.getChildrenSize() === 0 &&
    node.getTextContent() === ''
  );
}

export function $exportRootChildren(): LexicalNode[] {
  return $getRoot()
    .getChildren()
    .filter((node) => !$isTransientParagraphNode(node));
}
