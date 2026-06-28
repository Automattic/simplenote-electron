import { $isCodeNode } from '@lexical/code-core';
import { $getRoot, $isLineBreakNode, $isParagraphNode } from 'lexical';

import { $exportMarkdownStringForEditor } from './import-export';
import {
  importMarkdown,
  makeGfmTestEditor,
  roundtrip,
} from './gfm-test-helpers';

const SHIFT_RETURN_NOTE = 'zero  \nzero\n\none\n\none';

describe('GFM line break storage', () => {
  it('maps a paragraph break to two adjacent root paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(2);
      expect(children[0].getTextContent()).toBe('hello');
      expect(children[1].getTextContent()).toBe('world');
      expect($exportMarkdownStringForEditor(editor)).toBe('hello\n\nworld');
    });
    editor.dispose();
  });

  it('round-trips shift-return hard breaks with two trailing spaces', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, SHIFT_RETURN_NOTE);

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);

      const first = children[0];
      expect($isParagraphNode(first)).toBe(true);
      expect(first.getTextContent()).toBe('zero\nzero');
      expect(first.getChildren().some($isLineBreakNode)).toBe(true);
      expect(children[1].getTextContent()).toBe('one');
      expect(children[2].getTextContent()).toBe('one');
      expect($exportMarkdownStringForEditor(editor)).toBe(SHIFT_RETURN_NOTE);
    });
    editor.dispose();
  });

  it('leniently imports bare newline hard breaks from legacy notes', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'zero\nzero');

    editor.getEditorState().read(() => {
      const paragraph = $getRoot().getFirstChild();
      expect($isParagraphNode(paragraph)).toBe(true);
      expect(paragraph?.getTextContent()).toBe('zero\nzero');
      expect(paragraph?.getChildren().some($isLineBreakNode)).toBe(true);
    });
    editor.dispose();
  });

  it('exports legacy bare newline hard breaks as GFM two-space breaks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'zero\nzero');

    editor.getEditorState().read(() => {
      expect($exportMarkdownStringForEditor(editor)).toBe('zero  \nzero');
    });
    editor.dispose();
  });

  it('preserves extra blank-line gaps until export after import', () => {
    const markdown = 'before\n\n\nafter';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($getRoot().getChildren()).toHaveLength(2);
      expect($exportMarkdownStringForEditor(editor)).toBe(markdown);
    });
    editor.dispose();
  });

  it('round-trips a horizontal rule and heading with a single newline gap', () => {
    const markdown = '---\n# Title';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['horizontalrule', 'heading']);
      expect($exportMarkdownStringForEditor(editor)).toBe(markdown);
    });
    editor.dispose();
  });

  it('round-trips blank lines between different list types', () => {
    const markdown =
      '- First bullet\n- Second bullet\n\n1. First ordered\n2. Second ordered';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($exportMarkdownStringForEditor(editor)).toBe(markdown);
    });
    editor.dispose();
  });

  it('round-trips extra gaps between mixed block types', () => {
    const markdown = 'before\n\n\n```\ncode\n```\n\n\n> quote\n\nafter';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['paragraph', 'code', 'quote', 'paragraph']);
      expect($exportMarkdownStringForEditor(editor)).toBe(markdown);
    });
    editor.dispose();
  });

  it('keeps empty lines inside a fenced code block out of the root', () => {
    const markdown = '```\ntest\n\n\n\n```';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children.map((child) => child.getType())).toEqual(['code']);
      const code = children[0];
      expect($isCodeNode(code)).toBe(true);
      expect(code.getTextContent()).toBe('test\n\n\n');
      expect($exportMarkdownStringForEditor(editor)).toBe(markdown);
    });
    editor.dispose();
  });

  it('round-trips a paragraph followed by a fenced code block', () => {
    const markdown = 'hello\n\n```\ntest\n\n\n\n```';
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });
});
