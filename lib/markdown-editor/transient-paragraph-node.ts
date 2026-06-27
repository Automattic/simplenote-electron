import {
  type DOMExportOutput,
  type EditorConfig,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedParagraphNode,
  ParagraphNode,
} from 'lexical';

export type SerializedTransientParagraphNode = SerializedParagraphNode;

export class TransientParagraphNode extends ParagraphNode {
  static getType(): string {
    return 'transient-paragraph';
  }

  static clone(node: TransientParagraphNode): TransientParagraphNode {
    return new TransientParagraphNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    return super.createDOM(config);
  }

  updateDOM(
    prevNode: TransientParagraphNode,
    dom: HTMLElement,
    config: EditorConfig
  ): boolean {
    return super.updateDOM(prevNode, dom, config);
  }

  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    return { element: null };
  }

  static importDOM(): null {
    return null;
  }

  exportJSON(): SerializedTransientParagraphNode {
    return {
      ...super.exportJSON(),
      type: 'transient-paragraph',
      version: 1,
    };
  }

  static importJSON(
    serializedNode: SerializedTransientParagraphNode
  ): TransientParagraphNode {
    return $createTransientParagraphNode().updateFromJSON(serializedNode);
  }

  excludeFromCopy(): boolean {
    return true;
  }

  canBeEmpty(): boolean {
    return true;
  }
}

export function $createTransientParagraphNode(): TransientParagraphNode {
  return new TransientParagraphNode();
}

export function $isTransientParagraphNode(
  node: LexicalNode | null | undefined
): node is TransientParagraphNode {
  return node instanceof TransientParagraphNode;
}
