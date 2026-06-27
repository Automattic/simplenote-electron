/**
 * Test-only block decorator node for block-cursor navigation specs.
 * Registered only via makeBlockCursorTestEditor() in block-cursor-test-helpers.ts.
 */
import {
  $applyNodeReplacement,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from 'lexical';

export class BlockCursorTestNode extends DecoratorNode<null> {
  static getType(): string {
    return 'block-cursor-test';
  }

  static clone(node: BlockCursorTestNode): BlockCursorTestNode {
    return new BlockCursorTestNode(node.__key);
  }

  static importJSON(
    _serializedNode: SerializedLexicalNode
  ): BlockCursorTestNode {
    return $createBlockCursorTestNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const element = document.createElement('div');
    element.className = 'block-cursor-test-node';
    element.setAttribute('data-testid', 'block-cursor-test');
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): null {
    return null;
  }

  isInline(): boolean {
    return false;
  }

  exportJSON(): SerializedLexicalNode {
    return {
      type: 'block-cursor-test',
      version: 1,
    };
  }
}

export function $createBlockCursorTestNode(): BlockCursorTestNode {
  return $applyNodeReplacement(new BlockCursorTestNode());
}

export function $isBlockCursorTestNode(
  node: LexicalNode | null | undefined
): node is BlockCursorTestNode {
  return node instanceof BlockCursorTestNode;
}
