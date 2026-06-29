import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
} from 'lexical';

import {
  $exportMarkdownString,
  $importMarkdownString,
} from '../extensions/index';
import {
  $createEmptyLineParagraphNode,
  $isEmptyLineParagraphNode,
  EMPTY_LINE_MARKDOWN_EXPORT,
} from '../nodes/empty-line-paragraph-node';
import {
  countEmptyRootParagraphs,
  importMarkdown,
  makeGfmTestEditor,
  markdownWithGap,
  roundtrip,
} from './gfm-test-helpers';

describe('empty-line paragraphs', () => {
  it('exports intentional blank lines as nbsp paragraphs', () => {
    const markdown = markdownWithGap('before', 1, 'after');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($exportMarkdownString()).toBe(markdown);
      expect($exportMarkdownString()).toContain(EMPTY_LINE_MARKDOWN_EXPORT);
    });
    editor.dispose();
  });

  it('keeps empty-line paragraphs empty in the editor', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdownWithGap('before', 1, 'after'));

    editor.getEditorState().read(() => {
      const emptyLine = $getRoot().getChildren()[1];
      expect($isEmptyLineParagraphNode(emptyLine)).toBe(true);
      expect(emptyLine?.getTextContent()).toBe('');
    });
    editor.dispose();
  });

  it('imports legacy extra-newline gaps as empty paragraphs and re-exports newlines', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'one\n\n\n\ntwo');

    expect(countEmptyRootParagraphs(editor)).toBe(2);
    expect(roundtrip(editor, 'one\n\n\n\ntwo')).toBe('one\n\n\n\ntwo');
    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect($isEmptyLineParagraphNode(children[1])).toBe(false);
      expect($isEmptyLineParagraphNode(children[2])).toBe(false);
    });
    editor.dispose();
  });

  it('imports an exported nbsp paragraph back into an empty-line paragraph', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, EMPTY_LINE_MARKDOWN_EXPORT);

    editor.getEditorState().read(() => {
      const child = $getRoot().getFirstChild();
      expect($isEmptyLineParagraphNode(child)).toBe(true);
      expect(child?.getTextContent()).toBe('');
    });
    editor.dispose();
  });

  it('promotes an empty-line paragraph once the user types real content', async () => {
    const editor = makeGfmTestEditor(markdownWithGap('before', 1, 'after'));
    await Promise.resolve();

    editor.update(
      () => {
        const emptyLine = $getRoot().getChildren()[1];
        if (!$isEmptyLineParagraphNode(emptyLine)) {
          throw new Error('Expected empty-line paragraph');
        }
        emptyLine.selectStart();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText('hello');
        }
      },
      { discrete: true }
    );
    await Promise.resolve();

    editor.getEditorState().read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      expect($isParagraphNode(children[1])).toBe(true);
      expect($isEmptyLineParagraphNode(children[1])).toBe(false);
      expect(children[1].getTextContent()).toBe('hello');
    });
    editor.dispose();
  });

  it('creates empty-line paragraphs without placeholder text children', () => {
    const editor = makeGfmTestEditor();
    editor.update(
      () => {
        $getRoot().clear();
        $getRoot().append($createEmptyLineParagraphNode());
      },
      { discrete: true }
    );

    editor.getEditorState().read(() => {
      const child = $getRoot().getFirstChild();
      expect($isEmptyLineParagraphNode(child)).toBe(true);
      expect(child?.getTextContent()).toBe('');
      expect(child?.getChildrenSize()).toBe(0);
    });
    editor.dispose();
  });

  it('round-trips multiple nbsp paragraphs idempotently', () => {
    const markdown = [
      EMPTY_LINE_MARKDOWN_EXPORT,
      EMPTY_LINE_MARKDOWN_EXPORT,
    ].join('\n\n');
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect(
        $getRoot()
          .getChildren()
          .map((child) => child.getType())
      ).toEqual(['empty-line-paragraph', 'empty-line-paragraph']);
      expect($exportMarkdownString()).toBe(markdown);
    });
    editor.dispose();
  });

  it('imports markdown containing only a nbsp via string import', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, EMPTY_LINE_MARKDOWN_EXPORT);

    editor.getEditorState().read(() => {
      expect($isEmptyLineParagraphNode($getRoot().getFirstChild())).toBe(true);
      expect($getRoot().getFirstChild()?.getTextContent()).toBe('');
      expect($exportMarkdownString()).toBe(EMPTY_LINE_MARKDOWN_EXPORT);
    });
    editor.dispose();
  });
});
