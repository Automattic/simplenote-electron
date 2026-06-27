import { $isCodeNode } from '@lexical/code-core';
import { $getRoot, $isLineBreakNode, $isParagraphNode } from 'lexical';

import { $exportMarkdownString } from '../extensions/index';
import {
  countEmptyRootParagraphs,
  importMarkdown,
  makeGfmTestEditor,
  roundtrip,
} from './gfm-test-helpers';

const LINE_NATIVE_TYPING_NOTE = 'zero\nzero\n\none\n\none';

describe('line-native storage', () => {
  it('maps a single blank line to one empty root paragraph', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect(children[0].getTextContent()).toBe('hello');
      expect(children[1].getTextContent()).toBe('');
      expect(children[2].getTextContent()).toBe('world');
      expect($exportMarkdownString()).toBe('hello\n\nworld');
    });
    editor.dispose();
  });

  it('round-trips the shift-return typing fixture', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINE_NATIVE_TYPING_NOTE);

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(5);

      const first = children[0];
      expect($isParagraphNode(first)).toBe(true);
      expect(first.getTextContent()).toBe('zero\nzero');
      expect(first.getChildren().some($isLineBreakNode)).toBe(true);
      expect(children[2].getTextContent()).toBe('one');
      expect(children[4].getTextContent()).toBe('one');
      expect($exportMarkdownString()).toBe(LINE_NATIVE_TYPING_NOTE);
    });

    expect(countEmptyRootParagraphs(editor)).toBe(2);
    editor.dispose();
  });

  it('does not add a blank line between a horizontal rule and a heading', () => {
    const markdown = '---\n# Title';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['horizontalrule', 'heading']);
      expect($exportMarkdownString()).toBe(markdown);
    });
    editor.dispose();
  });

  it('round-trips empty lines between mixed block types', () => {
    const markdown = 'before\n\n\n```\ncode\n```\n\n\n> quote\n\nafter';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    expect(countEmptyRootParagraphs(editor)).toBe(5);
    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual([
        'paragraph',
        'paragraph',
        'paragraph',
        'code',
        'paragraph',
        'paragraph',
        'quote',
        'paragraph',
        'paragraph',
      ]);
      expect($exportMarkdownString()).toBe(markdown);
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
      expect($exportMarkdownString()).toBe(markdown);
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
