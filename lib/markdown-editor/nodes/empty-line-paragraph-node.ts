import {
  $createParagraphNode,
  $createTextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedParagraphNode,
  ParagraphNode,
} from 'lexical';
import type { ElementTransformer } from '@lexical/markdown';

// Intentional blank lines between blocks are stored as an empty paragraph node.
// Standard markdown renderers collapse extra newlines (\n\n\n), so export emits
// a non-breaking space only when serializing to markdown — the editor stays empty.
export const EMPTY_LINE_MARKDOWN_EXPORT = '\u00A0';

function trimAsciiWhitespace(text: string): string {
  return text.replace(/^[ \t]+|[ \t]+$/g, '');
}

export type SerializedEmptyLineParagraphNode = SerializedParagraphNode;

export function isEmptyLinePlaceholderMarkdown(markdown: string): boolean {
  return /^(?:&nbsp;|\u00A0)\s*$/i.test(trimAsciiWhitespace(markdown));
}

export function countEmptyLinePlaceholderLines(markdown: string): number {
  return markdown
    .split('\n')
    .filter((line) => isEmptyLinePlaceholderMarkdown(line)).length;
}

export class EmptyLineParagraphNode extends ParagraphNode {
  static getType(): string {
    return 'empty-line-paragraph';
  }

  static clone(node: EmptyLineParagraphNode): EmptyLineParagraphNode {
    return new EmptyLineParagraphNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    return super.createDOM(config);
  }

  updateDOM(
    prevNode: EmptyLineParagraphNode,
    dom: HTMLElement,
    config: EditorConfig
  ): boolean {
    return super.updateDOM(prevNode, dom, config);
  }

  exportJSON(): SerializedEmptyLineParagraphNode {
    return {
      ...super.exportJSON(),
      type: 'empty-line-paragraph',
      version: 1,
    };
  }

  static importJSON(
    serializedNode: SerializedEmptyLineParagraphNode
  ): EmptyLineParagraphNode {
    return $createEmptyLineParagraphNode().updateFromJSON(serializedNode);
  }

  canBeEmpty(): boolean {
    return true;
  }
}

export function $createEmptyLineParagraphNode(): EmptyLineParagraphNode {
  return new EmptyLineParagraphNode();
}

export function $isEmptyLineParagraphNode(
  node: LexicalNode | null | undefined
): node is EmptyLineParagraphNode {
  return node instanceof EmptyLineParagraphNode;
}

export function $prepareEmptyLineForCaret(node: EmptyLineParagraphNode): void {
  if (node.getChildrenSize() === 0) {
    node.append($createTextNode(''));
  }
}

export function $promoteEmptyLineParagraphIfNeeded(
  node: EmptyLineParagraphNode
): void {
  if (node.getTextContent().length === 0) {
    return;
  }

  const paragraph = $createParagraphNode();
  for (const child of node.getChildren()) {
    paragraph.append(child);
  }

  node.replace(paragraph);
  paragraph.selectEnd();
}

export const EMPTY_LINE_PARAGRAPH: ElementTransformer = {
  dependencies: [EmptyLineParagraphNode],
  export: (node: LexicalNode) =>
    $isEmptyLineParagraphNode(node) ? EMPTY_LINE_MARKDOWN_EXPORT : null,
  regExp: /^(?:&nbsp;|\u00A0)\s*$/i,
  replace: (parentNode, _children, _match, isImport) => {
    const emptyLine = $createEmptyLineParagraphNode();
    if (isImport || parentNode.getNextSibling() !== null) {
      parentNode.replace(emptyLine);
    } else {
      parentNode.insertBefore(emptyLine);
    }
    emptyLine.selectNext();
  },
  type: 'element',
};
