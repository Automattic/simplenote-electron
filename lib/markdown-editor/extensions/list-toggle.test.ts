import { $convertToMarkdownString } from '@lexical/markdown';
import { $isListItemNode, $isListNode } from '@lexical/list';
import {
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  KEY_DOWN_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './index';
import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
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

function selectTextRange(
  editor: LexicalEditorWithDispose,
  anchorText: string,
  focusText: string,
  anchorOffset = 0,
  focusOffset?: number
): void {
  editor.update(
    () => {
      const anchorNode = findTextNode($getRoot(), anchorText);
      const focusNode = findTextNode($getRoot(), focusText);
      if (!anchorNode || !focusNode) {
        throw new Error(
          `Expected text nodes with content ${JSON.stringify(anchorText)} and ${JSON.stringify(focusText)}`
        );
      }
      const selection = $createRangeSelection();
      selection.anchor.set(anchorNode.getKey(), anchorOffset, 'text');
      selection.focus.set(
        focusNode.getKey(),
        focusOffset ?? focusNode.getTextContentSize(),
        'text'
      );
      $setSelection(selection);
    },
    { discrete: true }
  );
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

async function flushToggleList(
  editor: LexicalEditorWithDispose,
  listType: Parameters<typeof toggleListAtSelection>[1]
): Promise<boolean> {
  const ran = toggleListAtSelection(editor, listType);
  await Promise.resolve();
  return ran;
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

  it('does not create a task list inside a table cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| Cell |', '| --- |', '| text |'].join('\n'));
    editor.update(
      () => {
        const table = $getRoot().getFirstChild();
        if (!table || !$isTableNode(table)) {
          throw new Error('Expected table at root');
        }
        const row = table.getChildAtIndex(1);
        if (!$isTableRowNode(row)) {
          throw new Error('Expected table row');
        }
        const cell = row.getChildAtIndex(0);
        if (!$isTableCellNode(cell)) {
          throw new Error('Expected table cell');
        }
        cell.selectStart();
      },
      { discrete: true }
    );

    await dispatchTaskListShortcut(editor, { ctrlKey: true });

    editor.getEditorState().read(() => {
      const table = $getRoot().getFirstChild();
      expect($isTableNode(table)).toBe(true);
      if (!$isTableNode(table)) {
        return;
      }
      const row = table.getChildAtIndex(1);
      const cell = row?.getChildAtIndex(0);
      expect(cell?.getChildren().some($isListNode)).toBe(false);
    });
    expect(exportMarkdown(editor)).toBe('| Cell |\n| --- |\n| text |');

    editor.dispose();
  });
});

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

  it('converts the outer list when the cursor is in outer item content', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- parent\n  - nested');
    selectTextNode(editor, 'parent', 2);

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('1. parent\n    - nested');

    editor.dispose();
  });

  it('converts the outer list when outer items are selected across a nested sublist', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- parent\n  - nested\n- sibling');
    selectTextRange(editor, 'parent', 'sibling');

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);
    expect(exportMarkdown(editor)).toBe('1. parent\n    - nested\n2. sibling');

    editor.dispose();
  });

  it('keeps the cursor in outer item content after converting the outer list type', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- parent\n  - nested');
    selectTextNode(editor, 'parent', 2);

    expect(await flushToggleList(editor, 'orderedList')).toBe(true);

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      expect(selection.anchor.getNode().getTextContent()).toBe('parent');
    });

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

  it('does not toggle lists inside a table cell', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, ['| Cell |', '| --- |', '| text |'].join('\n'));
    editor.update(
      () => {
        const table = $getRoot().getFirstChild();
        if (!table || !$isTableNode(table)) {
          throw new Error('Expected table at root');
        }
        const row = table.getChildAtIndex(1);
        if (!$isTableRowNode(row)) {
          throw new Error('Expected table row');
        }
        const cell = row.getChildAtIndex(0);
        if (!$isTableCellNode(cell)) {
          throw new Error('Expected table cell');
        }
        cell.selectStart();
      },
      { discrete: true }
    );

    expect(await flushToggleList(editor, 'bulletList')).toBe(false);
    expect(exportMarkdown(editor)).toBe('| Cell |\n| --- |\n| text |');

    editor.dispose();
  });
});
