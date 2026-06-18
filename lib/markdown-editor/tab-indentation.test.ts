import { $isCodeNode, $plainifyCodeContent } from '@lexical/code-core';
import { $convertToMarkdownString } from '@lexical/markdown';
import {
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

function selectTextRange(
  editor: LexicalEditorWithDispose,
  startText: string,
  endText: string
): void {
  editor.update(
    () => {
      const first = findTextNode($getRoot(), startText);
      const last = findTextNode($getRoot(), endText);
      if (!first || !last) {
        throw new Error('Expected text nodes for range selection');
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
  it('does not handle Tab in a plain paragraph', async () => {
    const editor = makeGfmTestEditor('hello');
    selectTextNode(editor, 'hello', 2);

    expect(await dispatchTab(editor)).toBe(false);
    expect(exportMarkdown(editor)).toBe('hello');

    editor.dispose();
  });

  it('does not handle Tab inside a blockquote', async () => {
    const editor = makeGfmTestEditor('> quoted');
    selectText(editor, 'quoted');

    expect(await dispatchTab(editor)).toBe(false);
    expect(exportMarkdown(editor)).toBe('> quoted');

    editor.dispose();
  });

  it('does not handle Tab inside a heading', async () => {
    const editor = makeGfmTestEditor('# Title');
    selectTextNode(editor, 'Title', 0);

    expect(await dispatchTab(editor)).toBe(false);
    expect(exportMarkdown(editor)).toBe('# Title');

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

  it('indents multiple fully selected list items together', async () => {
    const editor = makeGfmTestEditor();
    const unmount = mountEditor(editor);
    importMarkdown(editor, '- one\n- two\n- three');
    selectTextRange(editor, 'two', 'three');

    expect(await dispatchTab(editor)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "one"',
          '  item: ""',
          '    bullet',
          '      item: "two"',
          '      item: "three"',
        ].join('\n')
      );
    });

    unmount();
    editor.dispose();
  });

  it('outdents multiple fully selected list items together', async () => {
    const editor = makeGfmTestEditor();
    const unmount = mountEditor(editor);
    importMarkdown(editor, '- one\n  - two\n  - three');
    selectTextRange(editor, 'two', 'three');

    expect(await dispatchTab(editor, true)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        ['bullet', '  item: "one"', '  item: "two"', '  item: "three"'].join(
          '\n'
        )
      );
    });

    unmount();
    editor.dispose();
  });

  it('indents multiple list items when the first and last lines are only partly selected', async () => {
    const editor = makeGfmTestEditor();
    const unmount = mountEditor(editor);
    importMarkdown(editor, '- one\n- two\n- three');
    editor.update(
      () => {
        const two = findTextNode($getRoot(), 'two');
        const three = findTextNode($getRoot(), 'three');
        if (!two || !three) {
          throw new Error('Expected list item text nodes');
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        selection.anchor.set(two.getKey(), 1, 'text');
        selection.focus.set(three.getKey(), 2, 'text');
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
          '      item: "three"',
        ].join('\n')
      );
    });

    unmount();
    editor.dispose();
  });

  it('indents a list item when only part of a single item is selected', async () => {
    const editor = makeGfmTestEditor('- one\n- hello\n- three');
    selectText(editor, 'hello', 0, 3);

    expect(await dispatchTab(editor)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "one"',
          '  item: ""',
          '    bullet',
          '      item: "hello"',
          '  item: "three"',
        ].join('\n')
      );
    });

    editor.dispose();
  });

  it('indents a list item when its text is fully selected', async () => {
    const editor = makeGfmTestEditor('- one\n- hello\n- three');
    selectText(editor, 'hello');

    expect(await dispatchTab(editor)).toBe(true);

    editor.getEditorState().read(() => {
      expect(describeListTree($getRoot().getChildren())).toBe(
        [
          'bullet',
          '  item: "one"',
          '  item: ""',
          '    bullet',
          '      item: "hello"',
          '  item: "three"',
        ].join('\n')
      );
    });

    editor.dispose();
  });

  it('outdents a list item when its text is fully selected', async () => {
    const editor = makeGfmTestEditor('- one\n  - hello\n- three');
    selectText(editor, 'hello');

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(exportMarkdown(editor)).toBe('- one\n- hello\n- three');

    editor.dispose();
  });

  it('inserts a tab on an empty line without moving the caret to the end', async () => {
    const editor = makeGfmTestEditor('```\na\n\nb\n```');
    const unmount = mountEditor(editor);
    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        if (!code || !$isCodeNode(code)) {
          throw new Error('Expected a code block');
        }
        code.splice(0, code.getChildrenSize(), $plainifyCodeContent('a\n\nb'));
      },
      { discrete: true }
    );

    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        if (!code || !$isCodeNode(code)) {
          throw new Error('Expected a code block');
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        selection.anchor.set(code.getKey(), 2, 'element');
        selection.focus.set(code.getKey(), 2, 'element');
      },
      { discrete: true }
    );

    expect(await dispatchTab(editor)).toBe(true);
    expect(exportMarkdown(editor)).toContain('a\n\t\nb');

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        throw new Error('Expected range selection');
      }
      const code = $getRoot().getFirstChild();
      if (!code || !$isCodeNode(code)) {
        throw new Error('Expected a code block');
      }
      expect(code.getTextContent()).toBe('a\n\t\nb');
      expect(selection.focus.getNode().getTextContent()).not.toBe('b');

      let flatOffset = 0;
      for (const child of code.getChildren()) {
        if (child.getKey() === selection.focus.getNode().getKey()) {
          flatOffset += selection.focus.offset;
          break;
        }
        flatOffset += child.getTextContent().length;
      }
      expect(flatOffset).toBe(3);
    });

    unmount();
    editor.dispose();
  });

  it('inserts a tab in a code block', async () => {
    const editor = makeGfmTestEditor('```\nconst x = 1;\n```');
    selectTextNode(editor, 'const x = 1;', 5);

    expect(await dispatchTab(editor)).toBe(true);
    expect(exportMarkdown(editor)).toBe('```\nconst\t x = 1;\n```');

    editor.dispose();
  });

  it('indents multiple selected lines in a code block with highlight nodes', async () => {
    const editor = makeGfmTestEditor('```\na\nb\n```');
    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        if (!code || !$isCodeNode(code)) {
          throw new Error('Expected a code block');
        }
        code.splice(0, code.getChildrenSize(), $plainifyCodeContent('a\nb'));
        const firstLine = code.getFirstChild();
        const lastLine = code.getLastChild();
        if (!firstLine || !lastLine) {
          throw new Error('Expected plainified code children');
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('Expected range selection');
        }
        selection.anchor.set(firstLine.getKey(), 1, 'text');
        selection.focus.set(lastLine.getKey(), 0, 'text');
      },
      { discrete: true }
    );

    expect(await dispatchTab(editor)).toBe(true);
    expect(exportMarkdown(editor)).toBe('```\n\ta\n\tb\n```');

    editor.dispose();
  });

  it('indents multiple selected lines in a code block', async () => {
    const editor = makeGfmTestEditor('```\nconst a = 1;\nconst b = 2;\n```');
    editor.update(
      () => {
        const code = $getRoot().getFirstChild();
        if (!code || !$isElementNode(code)) {
          throw new Error('Expected a code block');
        }
        const textNode = code.getFirstChild();
        if (!$isTextNode(textNode)) {
          throw new Error('Expected code text node');
        }
        textNode.select(0, textNode.getTextContentSize());
      },
      { discrete: true }
    );

    expect(await dispatchTab(editor)).toBe(true);
    expect(exportMarkdown(editor)).toBe(
      '```\n\tconst a = 1;\n\tconst b = 2;\n```'
    );

    expect(await dispatchTab(editor, true)).toBe(true);
    expect(exportMarkdown(editor)).toBe('```\nconst a = 1;\nconst b = 2;\n```');

    editor.dispose();
  });
});
