import { $convertToMarkdownString } from '@lexical/markdown';
import { $isListItemNode, $isListNode } from '@lexical/list';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  KEY_DOWN_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import { toggleListAtSelection } from './list-toggle';

function findTextNode(node: LexicalNode, text: string): TextNode | undefined {
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

function makeEmptyParagraphEditor(): LexicalEditorWithDispose {
  const editor = makeGfmTestEditor();
  editor.update(
    () => {
      $getRoot().clear();
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectStart();
    },
    { discrete: true }
  );
  return editor;
}

function selectTextNode(
  editor: LexicalEditorWithDispose,
  text: string,
  offset = 1
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      textNode.select(offset, offset);
    },
    { discrete: true }
  );
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

async function dispatchTaskListShortcut(
  editor: LexicalEditorWithDispose,
  modifiers: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey'>
): Promise<boolean> {
  const handled = editor.dispatchCommand(
    KEY_DOWN_COMMAND,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'KeyC',
      key: 'c',
      shiftKey: true,
      ...modifiers,
    })
  );
  await Promise.resolve();
  return handled;
}

describe('task list keyboard shortcut', () => {
  it('creates a task list with Ctrl/Cmd+Shift+C', async () => {
    const editor = makeEmptyParagraphEditor();

    const handled = await dispatchTaskListShortcut(editor, { ctrlKey: true });
    expect(handled).toBe(true);

    editor.getEditorState().read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      if (!$isListNode(list)) {
        return;
      }
      expect(list.getListType()).toBe('check');

      const listItem = list.getFirstChild();
      expect($isListItemNode(listItem)).toBe(true);
      if (!$isListItemNode(listItem)) {
        throw new Error('Expected list item node');
      }
      expect(listItem.getChecked()).toBe(false);

      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe('- [ ] ');
    });

    editor.dispose();
  });
});

async function flushToggleList(
  editor: LexicalEditorWithDispose,
  listType: Parameters<typeof toggleListAtSelection>[1]
): Promise<boolean> {
  const ran = toggleListAtSelection(editor, listType);
  await Promise.resolve();
  return ran;
}

describe('toggleListAtSelection', () => {
  it('creates a bullet list in an empty paragraph', async () => {
    const editor = makeEmptyParagraphEditor();

    expect(await flushToggleList(editor, 'bulletList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- ');

    editor.dispose();
  });

  it('removes a bullet list when toggled again', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- one\n- two');
    selectTextNode(editor, 'one');

    expect(await flushToggleList(editor, 'bulletList')).toBe(true);

    editor.getEditorState().read(() => {
      expect($getRoot().getChildren().every($isParagraphNode)).toBe(true);
    });
    expect(exportMarkdown(editor)).toBe('one\n\ntwo');

    editor.dispose();
  });

  it('converts a bullet list to ordered', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- alpha\n- beta');
    selectTextNode(editor, 'alpha');

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('1. alpha\n2. beta');

    editor.dispose();
  });

  it('converts a bullet list to a task list', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- alpha\n- beta');
    selectTextNode(editor, 'alpha');

    expect(await flushToggleList(editor, 'taskList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- [ ] alpha\n- [ ] beta');

    editor.dispose();
  });

  it('converts an ordered list to bullet', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '1. first\n2. second');
    selectTextNode(editor, 'first');

    expect(await flushToggleList(editor, 'bulletList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- first\n- second');

    editor.dispose();
  });

  it('strips embedded task markers when converting a task list to bullet', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- [ ] - [ ] stray marker');
    selectTextNode(editor, '- [ ] stray marker');

    expect(await flushToggleList(editor, 'bulletList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- stray marker');

    editor.dispose();
  });

  it('converts a nested sublist type independently', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- parent\n  - nested');
    selectTextNode(editor, 'nested');

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- parent\n    1. nested');

    editor.dispose();
  });

  it('unwraps a nested sublist when toggling the same type off', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- parent\n  - nested');
    selectTextNode(editor, 'nested');

    expect(await flushToggleList(editor, 'bulletList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('- parent\n- nested');

    editor.dispose();
  });

  it('restores selection to the same item after converting list type', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- alpha\n- beta\n- gamma');
    selectTextNode(editor, 'beta', 2);

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      expect(selection.anchor.getNode().getTextContent()).toBe('beta');
      expect(selection.anchor.offset).toBe(0);
    });

    editor.dispose();
  });
});
