import { $getClipboardDataFromSelection } from '@lexical/clipboard';
import { $convertToMarkdownString } from '@lexical/markdown';
import { $isListNode } from '@lexical/list';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  DELETE_CHARACTER_COMMAND,
  PASTE_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { $insertMarkdownPasteNodes, MARKDOWN_TRANSFORMERS } from './extensions';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';
import { describeListTree } from './list-transformers';

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

function selectText(
  editor: LexicalEditorWithDispose,
  text: string,
  start = 0,
  end?: number
): void {
  editor.update(
    () => {
      const textNode = findTextNode($getRoot(), text);
      if (!textNode) {
        throw new Error(
          `Expected text node with content ${JSON.stringify(text)}`
        );
      }
      const size = textNode.getTextContentSize();
      textNode.select(start, end ?? size);
    },
    { discrete: true }
  );
}

async function dispatchDelete(
  editor: LexicalEditorWithDispose,
  backward = true
): Promise<boolean> {
  const handled = editor.dispatchCommand(DELETE_CHARACTER_COMMAND, backward);
  await Promise.resolve();
  return handled;
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

function rootChildTypes(editor: LexicalEditorWithDispose): string[] {
  return editor.getEditorState().read(() =>
    $getRoot()
      .getChildren()
      .map((child) => child.getType())
  );
}

describe('list deletion', () => {
  it('removes a fully selected bullet list item', async () => {
    const editor = makeGfmTestEditor('- one\n- two\n- three');
    selectText(editor, 'two');
    await dispatchDelete(editor);

    expect(exportMarkdown(editor)).toBe('- one\n- three');
    editor.dispose();
  });

  it('removes a fully selected ordered list item', async () => {
    const editor = makeGfmTestEditor('1. alpha\n2. beta\n3. gamma');
    selectText(editor, 'beta');
    await dispatchDelete(editor);

    expect(exportMarkdown(editor)).toBe('1. alpha\n2. gamma');
    editor.dispose();
  });

  it('removes a fully selected task list item', async () => {
    const editor = makeGfmTestEditor('- [ ] todo\n- [x] done');
    selectText(editor, 'todo');
    await dispatchDelete(editor);

    expect(exportMarkdown(editor)).toBe('- [x] done');
    editor.dispose();
  });

  it('removes the whole list when every item is selected', async () => {
    const editor = makeGfmTestEditor('- one\n- two');
    editor.update(
      () => {
        const first = findTextNode($getRoot(), 'one');
        const last = findTextNode($getRoot(), 'two');
        if (!first || !last) {
          throw new Error('Expected list item text nodes');
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        selection.anchor.set(first.getKey(), 0, 'text');
        selection.focus.set(last.getKey(), last.getTextContentSize(), 'text');
      },
      { discrete: true }
    );

    await dispatchDelete(editor);

    expect(exportMarkdown(editor)).toBe('');
    expect(rootChildTypes(editor)).toEqual(['paragraph']);
    editor.dispose();
  });

  it('does not remove a list item when only part of its text is selected', async () => {
    const editor = makeGfmTestEditor('- hello');
    selectText(editor, 'hello', 0, 2);
    await dispatchDelete(editor);

    expect(exportMarkdown(editor)).toBe('- llo');
    editor.dispose();
  });

  it('keeps nested list items when only their parent item is deleted', async () => {
    const editor = makeGfmTestEditor('- parent\n  - child');
    selectText(editor, 'parent');
    await dispatchDelete(editor);

    const markdown = exportMarkdown(editor);
    const tree = editor
      .getEditorState()
      .read(() => describeListTree($getRoot().getChildren()));

    expect(markdown).toBe('- child');
    expect(tree).toContain('item: "child"');
    editor.dispose();
  });

  it('cut and paste a middle list item round-trips via markdown text/plain', async () => {
    const editor = makeGfmTestEditor('- one\n- two\n- three');
    selectText(editor, 'two');

    const clipboardData = editor.read(() =>
      $getClipboardDataFromSelection($getSelection())
    );
    expect(clipboardData['text/plain']).toBe('- two\n');

    await dispatchDelete(editor);
    expect(exportMarkdown(editor)).toBe('- one\n- three');

    editor.update(
      () => {
        const pasted = $insertMarkdownPasteNodes(
          clipboardData['text/plain'] ?? '',
          $getSelection()?.anchor.getNode().getTopLevelElement() ?? null
        );
        if (!pasted) {
          throw new Error('Expected markdown paste to handle list item');
        }
      },
      { discrete: true }
    );

    expect(exportMarkdown(editor)).toBe('- one\n- two\n- three');
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      expect(selection.anchor.getNode().getTextContent()).toBe('two');
      expect(selection.anchor.offset).toBe(3);
    });
    editor.dispose();
  });

  it('cut and paste a middle list item round-trips via editor paste command', async () => {
    const editor = makeGfmTestEditor('- one\n- two\n- three');
    selectText(editor, 'two');

    const clipboardData = editor.read(() =>
      $getClipboardDataFromSelection($getSelection())
    );
    await dispatchDelete(editor);
    expect(exportMarkdown(editor)).toBe('- one\n- three');

    const pasteEvent = {
      clipboardData: {
        getData: (type: string) => clipboardData[type] ?? '',
      },
      preventDefault: jest.fn(),
    } as unknown as ClipboardEvent;

    editor.update(
      () => {
        const handled = editor.dispatchCommand(PASTE_COMMAND, pasteEvent);
        if (!handled) {
          throw new Error(
            'Expected markdown paste command to handle list item'
          );
        }
      },
      { discrete: true }
    );
    await Promise.resolve();

    expect(exportMarkdown(editor)).toBe('- one\n- two\n- three');
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      expect(selection.anchor.getNode().getTextContent()).toBe('two');
      expect(selection.anchor.offset).toBe(3);
    });
    editor.dispose();
  });

  it('leaves no empty list shell in the document tree', async () => {
    const editor = makeGfmTestEditor('- only');
    selectText(editor, 'only');
    await dispatchDelete(editor);

    const types = editor.getEditorState().read(() => {
      const types: string[] = [];
      const walk = (node: LexicalNode) => {
        types.push(node.getType());
        if ($isElementNode(node)) {
          for (const child of node.getChildren()) {
            walk(child);
          }
        }
      };
      for (const child of $getRoot().getChildren()) {
        walk(child);
      }
      return types;
    });

    expect(types).not.toContain('list');
    expect(types).not.toContain('listitem');
    editor.dispose();
  });
});
