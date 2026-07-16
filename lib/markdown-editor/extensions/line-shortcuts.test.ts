import { buildEditorFromExtensions } from '@lexical/extension';
import { $isCodeNode } from '@lexical/code-core';
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_DOWN_COMMAND,
  type LexicalEditorWithDispose,
  type LexicalNode,
  type TextNode,
} from 'lexical';

import { $getRootBlock } from './block-cursor-navigation';
import { $exportMarkdownString, createMarkdownEditorExtension } from './index';
import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
import { $isTransientParagraphNode } from '../nodes/transient-paragraph-node';
import * as searchHighlight from '../search/search-highlight';

type ShortcutChannel = 'keydown' | 'arrow';

function findTextNode(node: LexicalNode, text: string): TextNode | undefined {
  if ($isTextNode(node)) {
    const content = node.getTextContent();
    if (content === text) {
      return node;
    }

    const index = content.indexOf(text);
    if (index !== -1) {
      return node;
    }
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
      const content = textNode.getTextContent();
      const needleIndex = content.indexOf(text);
      const baseOffset = needleIndex === -1 ? 0 : needleIndex;
      const size = text.length;
      textNode.select(baseOffset + start, baseOffset + (end ?? start));
    },
    { discrete: true }
  );
}

function selectInCodeBlock(
  editor: LexicalEditorWithDispose,
  line: string,
  caret: 'start' | 'middle' | 'end' = 'middle'
): void {
  editor.update(
    () => {
      const code = $getRoot()
        .getChildren()
        .find((child) => $isCodeNode(child));
      if (!code || !$isCodeNode(code)) {
        throw new Error('Expected a code block');
      }

      const text = code.getTextContent();
      const lineStart = text.indexOf(line);
      if (lineStart === -1) {
        throw new Error(`Expected code line ${JSON.stringify(line)}`);
      }

      const caretOffset =
        caret === 'start'
          ? lineStart
          : caret === 'end'
            ? lineStart + line.length
            : lineStart + Math.floor(line.length / 2);

      const firstChild = code.getFirstChild();
      if (
        firstChild &&
        $isTextNode(firstChild) &&
        firstChild === code.getLastChild()
      ) {
        firstChild.select(caretOffset, caretOffset);
        return;
      }

      let offset = 0;
      for (const child of code.getChildren()) {
        const length = child.getTextContent().length;
        if (caretOffset < offset + length) {
          if ($isTextNode(child)) {
            child.select(caretOffset - offset, caretOffset - offset);
          }
          return;
        }
        offset += length;
      }
    },
    { discrete: true }
  );
}

function makeKeyboardEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
}

async function dispatchLineShortcut(
  editor: LexicalEditorWithDispose,
  init: KeyboardEventInit,
  channel: ShortcutChannel = 'keydown'
): Promise<boolean> {
  const event = makeKeyboardEvent(init);
  const command =
    channel === 'keydown'
      ? KEY_DOWN_COMMAND
      : init.key === 'ArrowUp'
        ? KEY_ARROW_UP_COMMAND
        : init.key === 'ArrowDown'
          ? KEY_ARROW_DOWN_COMMAND
          : KEY_DOWN_COMMAND;
  const handled = editor.dispatchCommand(command, event);
  await flushAnimationFrames(2);
  return handled;
}

async function flushAnimationFrames(count = 1): Promise<void> {
  for (let index = 0; index < count; index++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor.getEditorState().read(() => $exportMarkdownString());
}

function expectCollapsedCaret(
  editor: LexicalEditorWithDispose,
  text: string,
  offset: number
): void {
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    expect($isRangeSelection(selection)).toBe(true);
    if (!$isRangeSelection(selection)) {
      return;
    }

    expect(selection.isCollapsed()).toBe(true);
    expect(selection.anchor.offset).toBe(offset);
    expect(selection.focus.offset).toBe(offset);
    expect(selection.anchor.getNode().getTextContent()).toContain(text);
  });
}

function expectCaretNotInTransientGap(editor: LexicalEditorWithDispose): void {
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    expect($isRangeSelection(selection)).toBe(true);
    if (!$isRangeSelection(selection)) {
      return;
    }

    const anchorNode = selection.anchor.getNode();
    const parent = anchorNode.getParent();
    expect($isTransientParagraphNode(anchorNode)).toBe(false);
    if (parent !== null) {
      expect($isTransientParagraphNode(parent)).toBe(false);
    }

    const rootBlock = $getRootBlock(anchorNode);
    if (rootBlock !== null) {
      const previous = rootBlock.getPreviousSibling();
      expect($isTransientParagraphNode(previous)).toBe(false);
    }
  });
}

function mountLineShortcutEditor(markdown: string): {
  editor: LexicalEditorWithDispose;
  scrollContainer: HTMLDivElement;
  unmount: () => void;
} {
  const editor = buildEditorFromExtensions(createMarkdownEditorExtension(''));
  importMarkdown(editor, markdown);

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'lexical-md-editor-shell';
  Object.defineProperty(scrollContainer, 'clientHeight', {
    configurable: true,
    value: 200,
  });
  Object.defineProperty(scrollContainer, 'scrollHeight', {
    configurable: true,
    value: 2000,
  });

  const input = document.createElement('div');
  input.className = 'lexical-md-editor__input';
  input.contentEditable = 'true';
  scrollContainer.appendChild(input);
  document.body.appendChild(scrollContainer);

  editor.setRootElement(input);
  editor.getRootElement()?.focus();

  return {
    editor,
    scrollContainer,
    unmount: () => {
      editor.setRootElement(null);
      scrollContainer.remove();
      editor.dispose();
    },
  };
}

describe('line shortcuts', () => {
  describe('Option+arrow move via KEY_DOWN', () => {
    it('moves a root paragraph up and down', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond\n\nthird');
      selectText(editor, 'second', 2, 2);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('second\n\nfirst\n\nthird');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('first\n\nsecond\n\nthird');
    });

    it('does not move the first paragraph up', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond');
      selectText(editor, 'first', 0, 0);

      await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' });
      expect(exportMarkdown(editor)).toBe('first\n\nsecond');
      expectCollapsedCaret(editor, 'first', 0);
    });

    it('ignores plain arrow keys without Option', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond');
      selectText(editor, 'second', 0, 0);

      await dispatchLineShortcut(editor, { key: 'ArrowUp' });
      expect(exportMarkdown(editor)).toBe('first\n\nsecond');
      expectCollapsedCaret(editor, 'second', 0);
    });

    it('moves a list item up within a list instead of moving the whole list', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'before\n\n- one\n- two\n- three\n\nafter');
      selectText(editor, 'two', 0, 0);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe(
        'before\n\n- two\n- one\n- three\n\nafter'
      );
    });

    it('moves a line within a code block when not at the block edge', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '```\nalpha\nbeta\ngamma\n```\n\nparagraph');
      selectInCodeBlock(editor, 'beta');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe(
        '```\nbeta\nalpha\ngamma\n```\n\nparagraph'
      );
    });

    it('does not move a code block down from a middle line', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '```\nalpha\nbeta\ngamma\n```\n\nparagraph');
      selectInCodeBlock(editor, 'beta');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe(
        '```\nalpha\ngamma\nbeta\n```\n\nparagraph'
      );
    });

    it('moves a whole code block down from its last line', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '```\nalpha\nbeta\n```\n\nparagraph');
      selectInCodeBlock(editor, 'beta', 'end');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('paragraph\n\n```\nalpha\nbeta\n```');
    });

    it('moves a whole code block up from its first line', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'paragraph\n\n```\nalpha\nbeta\n```');
      selectInCodeBlock(editor, 'alpha', 'start');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('```\nalpha\nbeta\n```\n\nparagraph');
    });

    it('moves a whole list down from its last item', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'before\n\n- one\n- two\n\nafter');
      selectText(editor, 'two', 0, 0);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('before\n\nafter\n\n- one\n- two');
    });

    it('moves a whole list up from its first item', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'before\n\n- one\n- two\n\nafter');
      selectText(editor, 'one', 0, 0);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('- one\n- two\n\nbefore\n\nafter');
    });

    it('moves a code block below a paragraph in a mixed note', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '```\ntest\n```\n\ntest\n\n- test\n- test');
      selectInCodeBlock(editor, 'test', 'end');

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe(
        'test\n\n```\ntest\n```\n\n- test\n- test'
      );
    });

    it('moves a soft line up within a paragraph', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'alpha  \nbeta');
      selectText(editor, 'beta', 2, 2);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('beta  \nalpha');
      expectCollapsedCaret(editor, 'beta', 2);
    });
  });

  describe('caret preservation', () => {
    it('preserves the caret offset after moving a paragraph up', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond');
      selectText(editor, 'second', 3, 3);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expectCollapsedCaret(editor, 'second', 3);
      expect(exportMarkdown(editor)).toBe('second\n\nfirst');
    });

    it('keeps the caret on the moved line at offset 0 without opening a gap', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond');
      selectText(editor, 'second', 0, 0);

      expect(
        await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowUp' })
      ).toBe(true);
      expectCollapsedCaret(editor, 'second', 0);
      expectCaretNotInTransientGap(editor);
      expect(exportMarkdown(editor)).toBe('second\n\nfirst');
    });
  });

  describe('Shift+Option+arrow duplicate via KEY_DOWN', () => {
    it('duplicates a paragraph below', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'alpha\n\nbeta');
      selectText(editor, 'alpha', 0, 0);

      expect(
        await dispatchLineShortcut(editor, {
          altKey: true,
          key: 'ArrowDown',
          shiftKey: true,
        })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('alpha\n\nalpha\n\nbeta');
    });

    it('duplicates a list item below with content', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '- one\n- two\n- three');
      selectText(editor, 'two', 0, 0);

      expect(
        await dispatchLineShortcut(editor, {
          altKey: true,
          key: 'ArrowDown',
          shiftKey: true,
        })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('- one\n- two\n- two\n- three');
    });

    it('duplicates a list item above with content', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '- one\n- two\n- three');
      selectText(editor, 'two', 0, 0);

      expect(
        await dispatchLineShortcut(editor, {
          altKey: true,
          key: 'ArrowUp',
          shiftKey: true,
        })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('- one\n- two\n- two\n- three');
    });

    it('duplicates a line within a code block below', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, '```\nalpha\nbeta\n```');
      selectInCodeBlock(editor, 'beta');

      expect(
        await dispatchLineShortcut(editor, {
          altKey: true,
          key: 'ArrowDown',
          shiftKey: true,
        })
      ).toBe(true);
      expect(exportMarkdown(editor)).toBe('```\nalpha\nbeta\nbeta\n```');
    });
  });

  describe('KEY_ARROW command fallback', () => {
    it('handles Option+arrow through KEY_ARROW_UP_COMMAND as well', async () => {
      const editor = makeGfmTestEditor();
      importMarkdown(editor, 'first\n\nsecond');
      selectText(editor, 'second', 0, 0);

      expect(
        await dispatchLineShortcut(
          editor,
          { altKey: true, key: 'ArrowUp' },
          'arrow'
        )
      ).toBe(true);
      expectCollapsedCaret(editor, 'second', 0);
      expect(exportMarkdown(editor)).toBe('second\n\nfirst');
    });
  });

  describe('scroll into view', () => {
    it('scrolls the markdown shell after moving a block', async () => {
      const scrollSpy = jest
        .spyOn(searchHighlight, 'scrollRangeIntoView')
        .mockImplementation(() => {});

      const lines = Array.from(
        { length: 40 },
        (_, index) => `line ${index + 1}`
      );
      const markdown = `${lines.join('\n\n')}\n\nmove me\n\nanchor`;
      const { editor, unmount } = mountLineShortcutEditor(markdown);

      try {
        selectText(editor, 'move me', 0, 0);

        expect(
          await dispatchLineShortcut(editor, { altKey: true, key: 'ArrowDown' })
        ).toBe(true);
        expect(exportMarkdown(editor)).toBe(
          [...lines, 'anchor', 'move me'].join('\n\n')
        );

        await flushAnimationFrames(2);
        expect(scrollSpy).toHaveBeenCalledTimes(1);
        expect(scrollSpy.mock.calls[0]?.[0].className).toBe(
          'lexical-md-editor-shell'
        );
      } finally {
        scrollSpy.mockRestore();
        unmount();
      }
    });
  });
});
