import { $convertToMarkdownString } from '@lexical/markdown';
import { $isListItemNode, $isListNode } from '@lexical/list';
import {
  $createParagraphNode,
  $getRoot,
  KEY_DOWN_COMMAND,
  type LexicalEditorWithDispose,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
import { makeGfmTestEditor } from './gfm-test-helpers';

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
      if ($isListItemNode(listItem)) {
        expect(listItem.getChecked()).toBe(false);
      }

      expect($convertToMarkdownString(MARKDOWN_TRANSFORMERS)).toBe('- [ ] ');
    });
  });
});
