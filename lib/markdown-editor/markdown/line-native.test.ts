import { $createParagraphNode, $createTextNode } from 'lexical';
import { $isCodeNode } from '@lexical/code-core';
import { $getRoot, $isLineBreakNode, $isParagraphNode } from 'lexical';

import {
  $exportMarkdownString,
  $importMarkdownString,
} from '../extensions/index';
import {
  countEmptyRootParagraphs,
  importMarkdown,
  makeGfmTestEditor,
  markdownWithGap,
  roundtrip,
} from './gfm-test-helpers';
import { $isEmptyLineParagraphNode } from '../nodes/empty-line-paragraph-node';

const LINE_NATIVE_TYPING_NOTE = 'zero\nzero\n\none\n\none';
const LINE_NATIVE_TYPING_NOTE_EXPORTED = 'zero  \nzero\n\none\n\none';

describe('line-native storage', () => {
  it('uses \\n\\n as the block separator between adjacent paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\nworld');

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(2);
      expect(children[0].getTextContent()).toBe('hello');
      expect(children[1].getTextContent()).toBe('world');
      expect($exportMarkdownString()).toBe('hello\n\nworld');
    });
    editor.dispose();
  });

  it('round-trips adjacent paragraphs without inserting an empty root paragraph', () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        const one = $createParagraphNode();
        one.append($createTextNode('one'));
        const two = $createParagraphNode();
        two.append($createTextNode('two'));
        $getRoot().clear();
        $getRoot().append(one, two);
      },
      { discrete: true }
    );

    const exported = editor
      .getEditorState()
      .read(() => $exportMarkdownString());
    expect(exported).toBe('one\n\ntwo');

    editor.update(() => $importMarkdownString(exported), { discrete: true });

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(2);
      expect(children.every($isParagraphNode)).toBe(true);
      expect(children[0].getTextContent()).toBe('one');
      expect(children[1].getTextContent()).toBe('two');
    });
    editor.dispose();
  });

  it('maps legacy \\n\\n\\n gaps to one empty paragraph between blocks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'hello\n\n\nworld');

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect(children[0].getTextContent()).toBe('hello');
      expect($isEmptyLineParagraphNode(children[1])).toBe(false);
      expect($isParagraphNode(children[1])).toBe(true);
      expect(children[1].getTextContent()).toBe('');
      expect(children[2].getTextContent()).toBe('world');
      expect($exportMarkdownString()).toBe('hello\n\n\nworld');
    });
    editor.dispose();
  });

  it('round-trips the shift-return typing fixture', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, LINE_NATIVE_TYPING_NOTE);

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);

      const first = children[0];
      expect($isParagraphNode(first)).toBe(true);
      if (!$isParagraphNode(first)) {
        throw new Error('Expected first child to be a paragraph node');
      }
      expect(first.getTextContent()).toBe('zero\nzero');
      expect(first.getChildren().some($isLineBreakNode)).toBe(true);
      expect(children[1].getTextContent()).toBe('one');
      expect(children[2].getTextContent()).toBe('one');
      expect($exportMarkdownString()).toBe(LINE_NATIVE_TYPING_NOTE_EXPORTED);
    });

    expect(countEmptyRootParagraphs(editor)).toBe(0);
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
    const markdown = markdownWithGap(
      'before',
      2,
      ['```', 'code', '```'].join('\n')
    );
    const markdownWithQuote = markdownWithGap(
      markdown.replace(/\n$/, ''),
      2,
      '> quote'
    );
    const fullMarkdown = markdownWithGap(markdownWithQuote, 1, 'after');

    const editor = makeGfmTestEditor();
    importMarkdown(editor, fullMarkdown);

    expect(countEmptyRootParagraphs(editor)).toBe(5);
    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual([
        'paragraph',
        'empty-line-paragraph',
        'empty-line-paragraph',
        'code',
        'empty-line-paragraph',
        'empty-line-paragraph',
        'quote',
        'empty-line-paragraph',
        'paragraph',
      ]);
      expect($exportMarkdownString()).toBe(fullMarkdown);
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

  it('round-trips a list followed by a fenced code block', () => {
    const markdown = '- test2\n\n```\ntest\n```';
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });

  it('round-trips a paragraph followed by a fenced code block', () => {
    const markdown = 'hello\n\n```\ntest\n\n\n\n```';
    const editor = makeGfmTestEditor();
    expect(roundtrip(editor, markdown)).toBe(markdown);
    editor.dispose();
  });
});
