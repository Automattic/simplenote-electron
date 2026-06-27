import { buildEditorFromExtensions, defineExtension } from '@lexical/extension';
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalCommand,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { createMarkdownEditorExtension } from './index';
import {
  $isTransientParagraphNode,
  type TransientParagraphNode,
} from '../nodes/transient-paragraph-node';
import {
  $createBlockCursorTestNode,
  $isBlockCursorTestNode,
  BlockCursorTestNode,
} from './block-cursor-test-node';

const BlockCursorTestNodeExtension = defineExtension({
  name: '@test/block-cursor-test-node',
  nodes: [BlockCursorTestNode],
});

export function makeBlockCursorTestEditor(
  initialMarkdown = ''
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    createMarkdownEditorExtension(initialMarkdown),
    BlockCursorTestNodeExtension
  );
}

export function findTextNode(
  node: LexicalNode,
  text: string
): TextNode | undefined {
  if ($isTextNode(node) && node.getTextContent() === text) {
    return node;
  }
  if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      const found = findTextNode(child, text);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export function getFocusedTransient(
  editor: LexicalEditorWithDispose
): TransientParagraphNode | null {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }

    const anchorNode = selection.anchor.getNode();
    if ($isTransientParagraphNode(anchorNode)) {
      return anchorNode;
    }

    const parent = anchorNode.getParent();
    return $isTransientParagraphNode(parent) ? parent : null;
  });
}

export function expectTransientCaret(
  selection: ReturnType<typeof $getSelection>
): void {
  expect($isRangeSelection(selection)).toBe(true);
  if (!$isRangeSelection(selection)) {
    return;
  }

  const anchorNode = selection.anchor.getNode();
  const transient = $isTransientParagraphNode(anchorNode)
    ? anchorNode
    : $isTransientParagraphNode(anchorNode.getParent())
      ? anchorNode.getParent()
      : null;
  expect(transient).not.toBeNull();
}

export async function flushEditorUpdates(
  editor: LexicalEditorWithDispose
): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export function selectTextNode(
  editor: LexicalEditorWithDispose,
  text: string,
  offset: number
): void {
  editor.update(() => {
    const textNode = findTextNode($getRoot(), text);
    if (!textNode) {
      throw new Error(
        `Expected text node with content ${JSON.stringify(text)}`
      );
    }
    textNode.select(offset, offset);
  });
}

export async function dispatchBackspace(
  editor: LexicalEditorWithDispose,
  init: KeyboardEventInit = {}
): Promise<boolean> {
  const handled = editor.dispatchCommand(
    KEY_BACKSPACE_COMMAND,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Backspace',
      key: 'Backspace',
      ...init,
    })
  );
  await flushEditorUpdates(editor);
  return handled;
}

export async function dispatchEnter(
  editor: LexicalEditorWithDispose,
  init: KeyboardEventInit = {}
): Promise<boolean> {
  const handled = editor.dispatchCommand(
    KEY_ENTER_COMMAND,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Enter',
      key: 'Enter',
      ...init,
    })
  );
  await flushEditorUpdates(editor);
  return handled;
}

export async function dispatchArrow(
  editor: LexicalEditorWithDispose,
  command: LexicalCommand<KeyboardEvent>,
  init: KeyboardEventInit = {}
): Promise<boolean> {
  const key =
    command === KEY_ARROW_UP_COMMAND
      ? 'ArrowUp'
      : command === KEY_ARROW_DOWN_COMMAND
        ? 'ArrowDown'
        : command === KEY_ARROW_LEFT_COMMAND
          ? 'ArrowLeft'
          : command === KEY_ARROW_RIGHT_COMMAND
            ? 'ArrowRight'
            : 'ArrowLeft';
  const handled = editor.dispatchCommand(
    command,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: key,
      key,
      ...init,
    })
  );
  await flushEditorUpdates(editor);
  return handled;
}

export function expectTextCaret(
  selection: ReturnType<typeof $getSelection>,
  text: string,
  offset: number
): void {
  expect($isRangeSelection(selection)).toBe(true);
  if (!$isRangeSelection(selection)) {
    return;
  }
  expect(selection.anchor.type).toBe('text');
  expect(selection.anchor.offset).toBe(offset);
  expect(selection.anchor.getNode().getTextContent()).toBe(text);
}

export function selectedNodeKeys(
  editor: LexicalEditorWithDispose,
  predicate: (node: LexicalNode) => boolean
): string[] {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isNodeSelection(selection)) {
      return [];
    }
    return selection
      .getNodes()
      .filter(predicate)
      .map((node) => node.getKey());
  });
}

export function selectRootChildByPredicate(
  editor: LexicalEditorWithDispose,
  index: number,
  predicate: (node: LexicalNode) => boolean
): void {
  editor.update(() => {
    const node = $getRoot().getChildren().filter(predicate)[index];
    if (!node) {
      throw new Error(`Expected matching root child at index ${index}`);
    }
    const selection = $createNodeSelection();
    selection.add(node.getKey());
    $setSelection(selection);
  });
}

export function importBlockCursorTestDocument(
  editor: LexicalEditorWithDispose,
  {
    before,
    blockCount,
    after,
  }: {
    before?: string;
    blockCount: number;
    after?: string;
  }
): void {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();

      if (before) {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(before));
        root.append(paragraph);
      }

      for (let index = 0; index < blockCount; index++) {
        root.append($createBlockCursorTestNode());
      }

      if (after) {
        const paragraph = $createParagraphNode();
        paragraph.append($createTextNode(after));
        root.append(paragraph);
      }
    },
    { discrete: true }
  );
}

export function blockCursorTestNodeKeys(
  editor: LexicalEditorWithDispose
): string[] {
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .filter($isBlockCursorTestNode)
      .map((node) => node.getKey())
  );
}

export function selectBlockCursorTestNode(
  editor: LexicalEditorWithDispose,
  index: number
): void {
  selectRootChildByPredicate(editor, index, $isBlockCursorTestNode);
}
