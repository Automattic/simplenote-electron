import { $getRoot, $isParagraphNode, $isTextNode } from 'lexical';

import { $exportMarkdownString } from '../extensions/index';
import { $assembleStoredMarkdown } from './markdown-export';
import { importMarkdown, makeGfmTestEditor } from './gfm-test-helpers';

describe('markdown coordinates', () => {
  it('matches full stored export', () => {
    const markdown = 'hello\n\nworld';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($assembleStoredMarkdown()).toBe($exportMarkdownString());
      expect($assembleStoredMarkdown()).toBe(markdown);
    });
    editor.dispose();
  });

  it('maps hard breaks with two trailing spaces', () => {
    const markdown = 'zero  \nzero';
    const editor = makeGfmTestEditor();
    importMarkdown(editor, markdown);

    editor.getEditorState().read(() => {
      expect($assembleStoredMarkdown()).toBe(markdown);
    });
    editor.dispose();
  });
});
