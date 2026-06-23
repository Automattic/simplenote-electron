import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
} from 'lexical';
import { $isCodeNode } from '@lexical/code-core';
import { registerMarkdownShortcuts } from '@lexical/markdown';

import {
  $exportMarkdownString,
  $importMarkdownString,
  MARKDOWN_TRANSFORMERS,
} from './extensions';
import { makeGfmTestEditor } from './gfm-test-helpers';

function typeAtEnd(editor: ReturnType<typeof makeGfmTestEditor>, text: string) {
  for (const char of text) {
    editor.update(
      () => {
        const last = $getRoot().getLastDescendant();
        if (last) {
          last.selectEnd();
        } else {
          $getRoot().selectEnd();
        }
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(char);
        }
      },
      { discrete: true }
    );
  }
}

describe('$importMarkdownString', () => {
  it('imports non-list blocks as direct children of the root', () => {
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString('# title\n\nhello\n\nworld'), {
      discrete: true,
    });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect(children[0].getType()).toBe('heading');
      expect($isParagraphNode(children[1])).toBe(true);
      expect(children[1].getTextContent()).toBe('hello');
      expect(children[2].getTextContent()).toBe('world');
    });
    editor.dispose();
  });

  it('round-trips imported paragraphs without merging them', () => {
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString('hello\n\nworld'), {
      discrete: true,
    });

    const roundtrip = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(roundtrip).toBe('hello\n\nworld');
    editor.dispose();
  });

  it('round-trips empty paragraphs between content blocks', () => {
    const markdown = 'hello\n\n\nworld';
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString(markdown), { discrete: true });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(4);
      expect(children[0].getTextContent()).toBe('hello');
      expect($isParagraphNode(children[1])).toBe(true);
      expect(children[1].getTextContent()).toBe('');
      expect($isParagraphNode(children[2])).toBe(true);
      expect(children[2].getTextContent()).toBe('');
      expect(children[3].getTextContent()).toBe('world');
    });

    const roundtrip = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(roundtrip).toBe(markdown);
    editor.dispose();
  });

  it('imports a whitespace-only note as empty paragraphs', () => {
    const markdown = '\n\n\n';
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString(markdown), { discrete: true });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(4);
      for (const child of children) {
        expect($isParagraphNode(child)).toBe(true);
        expect(child.getTextContent()).toBe('');
      }
    });

    const roundtrip = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(roundtrip).toBe(markdown);
    editor.dispose();
  });

  it('keeps element markdown shortcuts working inside imported notes', async () => {
    const editor = makeGfmTestEditor();
    registerMarkdownShortcuts(editor, MARKDOWN_TRANSFORMERS);
    editor.update(() => $importMarkdownString('hello'), { discrete: true });

    editor.update(
      () => {
        $getRoot().getLastDescendant()!.selectEnd();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertParagraph();
        }
      },
      { discrete: true }
    );
    typeAtEnd(editor, '# ');
    await Promise.resolve();

    editor.getEditorState().read(() => {
      const lastBlock = $getRoot().getLastChild();
      expect(lastBlock?.getType()).toBe('heading');
    });
    editor.dispose();
  });

  it('round-trips a code block with empty lines', () => {
    const markdown = '```\ntest\n\n\n\n```';
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString(markdown), { discrete: true });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children.map((child) => child.getType())).toEqual(['code']);
      const code = children[0];
      expect($isCodeNode(code)).toBe(true);
      expect(code.getTextContent()).toBe('test\n\n\n');
    });

    const roundtrip = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(roundtrip).toBe(markdown);
    editor.dispose();
  });

  it('round-trips a paragraph followed by a code block with empty lines', () => {
    const markdown = 'hello\n\n```\ntest\n\n\n\n```';
    const editor = makeGfmTestEditor();
    editor.update(() => $importMarkdownString(markdown), { discrete: true });

    const roundtrip = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(roundtrip).toBe(markdown);
    editor.dispose();
  });

  // Without an initial selection, Lexical's focus handling falls back to
  // selectEnd(), which scrolls long notes to the bottom on first focus.
  it('places the caret at the document start after the initial import', async () => {
    const editor = makeGfmTestEditor('# title\n\nhello\n\nworld');
    // The init update commits asynchronously while no root element is
    // attached; flush the microtask queue before reading.
    await Promise.resolve();

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if (!$isRangeSelection(selection)) {
        return;
      }

      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.offset).toBe(0);

      const anchorBlock = selection.anchor
        .getNode()
        .getTopLevelElementOrThrow();
      expect(anchorBlock.is($getRoot().getFirstChild())).toBe(true);
    });
    editor.dispose();
  });
});
