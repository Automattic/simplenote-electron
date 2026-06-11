import { $convertToMarkdownString } from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTabNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  KEY_TAB_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { MARKDOWN_TRANSFORMERS } from './extensions';
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

// Command listeners run in a non-discrete update; the committed state is not
// visible from getEditorState() until the next microtask (same gotcha as
// checklist-toggle.test.ts), hence the await after dispatching.
async function dispatchTab(
  editor: LexicalEditorWithDispose,
  shiftKey = false
): Promise<boolean> {
  const handled = editor.dispatchCommand(
    KEY_TAB_COMMAND,
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      code: 'Tab',
      key: 'Tab',
      shiftKey,
    })
  );
  await Promise.resolve();
  return handled;
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor
    .getEditorState()
    .read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

function textContent(editor: LexicalEditorWithDispose): string {
  return editor.getEditorState().read(() => $getRoot().getTextContent());
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

function typeText(editor: LexicalEditorWithDispose, text: string): void {
  editor.update(
    () => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText(text);
      }
    },
    { discrete: true }
  );
}

// The DOM reconciler only runs against a mounted root element; structural
// list bugs (e.g. "DOMSlot.insertChild: before is not in element") are
// invisible in headless tests.
function mountEditor(editor: LexicalEditorWithDispose): () => void {
  const container = document.createElement('div');
  container.contentEditable = 'true';
  document.body.appendChild(container);
  editor.setRootElement(container);
  return () => {
    editor.setRootElement(null);
    container.remove();
  };
}

function selectTextNode(
  editor: LexicalEditorWithDispose,
  text: string,
  offset: number
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

describe('tab indentation', () => {
  it('inserts a tab character in an empty paragraph', async () => {
    const editor = makeEmptyParagraphEditor();

    expect(await dispatchTab(editor)).toBe(true);
    expect(exportMarkdown(editor)).toBe('\t');

    editor.dispose();
  });

  it('Tab then Shift+Tab returns to an empty paragraph', async () => {
    const editor = makeEmptyParagraphEditor();

    await dispatchTab(editor);
    expect(textContent(editor)).toBe('\t');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(textContent(editor)).toBe('');
    expect(exportMarkdown(editor)).toBe('');

    editor.dispose();
  });

  it('Tab twice then Shift+Tab leaves a single tab', async () => {
    const editor = makeEmptyParagraphEditor();

    await dispatchTab(editor);
    await dispatchTab(editor);
    expect(textContent(editor)).toBe('\t\t');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(textContent(editor)).toBe('\t');

    editor.dispose();
  });

  it('typed text then Tab then Shift+Tab leaves just the text', async () => {
    const editor = makeEmptyParagraphEditor();
    typeText(editor, 'test');

    await dispatchTab(editor);
    expect(textContent(editor)).toBe('test\t');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(textContent(editor)).toBe('test');
    expect(exportMarkdown(editor)).toBe('test');

    editor.dispose();
  });

  it('removes a leading tab when pressing Shift+Tab with the cursor after it', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        $getRoot().clear();
        const paragraph = $createParagraphNode();
        const tabNode = $createTabNode();
        paragraph.append(tabNode);
        $getRoot().append(paragraph);
        tabNode.selectNext(0, 0);
      },
      { discrete: true }
    );
    expect(exportMarkdown(editor)).toBe('\t');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(exportMarkdown(editor)).toBe('');

    editor.dispose();
  });

  it('removes a leading tab when pressing Shift+Tab with the cursor before it', async () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        $getRoot().clear();
        const paragraph = $createParagraphNode();
        paragraph.append($createTabNode());
        $getRoot().append(paragraph);
        paragraph.selectStart();
      },
      { discrete: true }
    );
    expect(exportMarkdown(editor)).toBe('\t');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(exportMarkdown(editor)).toBe('');

    editor.dispose();
  });

  it('nests a list item when pressing Tab with the cursor in the middle of its text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- one\n- two');
    editor.update(
      () => {
        const textNode = findTextNode($getRoot(), 'two');
        if (!textNode) {
          throw new Error('Expected text node with content "two"');
        }
        textNode.select(1, 1);
      },
      { discrete: true }
    );

    expect(await dispatchTab(editor)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "one"',
          '  item: ""',
          '    bullet',
          '      item: "two"',
        ].join('\n')
      );
    });

    editor.dispose();
  });

  it('outdents an item with nested descendants without crashing the reconciler', async () => {
    const editor = makeGfmTestEditor();
    const unmount = mountEditor(editor);
    importMarkdown(editor, '- 1\n  - 2\n    - 3\n      - 4');
    selectTextNode(editor, '2', 1);

    expect(await dispatchTab(editor, true)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "1"',
          '  item: "2"',
          '  item: ""',
          '    bullet',
          '      item: "3"',
          '      item: ""',
          '        bullet',
          '          item: "4"',
        ].join('\n')
      );
    });

    unmount();
    editor.dispose();
  });

  it('indents an item with nested descendants, keeping their relative depth', async () => {
    const editor = makeGfmTestEditor();
    const unmount = mountEditor(editor);
    importMarkdown(editor, '- 1\n- 2\n  - 3');
    selectTextNode(editor, '2', 1);

    expect(await dispatchTab(editor)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "1"',
          '  item: ""',
          '    bullet',
          '      item: "2"',
          '      item: ""',
          '        bullet',
          '          item: "3"',
        ].join('\n')
      );
    });

    unmount();
    editor.dispose();
  });

  it('un-nests a list item when pressing Shift+Tab with the cursor in the middle of its text', async () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, '- one\n  - two');
    editor.update(
      () => {
        const textNode = findTextNode($getRoot(), 'two');
        if (!textNode) {
          throw new Error('Expected text node with content "two"');
        }
        textNode.select(1, 1);
      },
      { discrete: true }
    );

    expect(await dispatchTab(editor, true)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        ['bullet', '  item: "one"', '  item: "two"'].join('\n')
      );
    });

    editor.dispose();
  });
});
