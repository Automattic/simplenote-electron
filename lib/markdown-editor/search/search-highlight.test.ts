import {
  importMarkdown,
  makeGfmTestEditor,
} from '../markdown/gfm-test-helpers';
import { $collectTextSegments, $getTextMatchRanges } from './search-highlight';

describe('markdown editor search highlights', () => {
  it('collects visible text with paragraph breaks', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Hello\n\nWorld');

    const { text } = editor.getEditorState().read(() => $collectTextSegments());

    expect(text).toBe('Hello\n\nWorld');
  });

  it('finds case-insensitive matches in visible text', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'Hello **WORLD**');

    const matches = editor
      .getEditorState()
      .read(() => $getTextMatchRanges('world'));

    expect(matches).toEqual([{ start: 6, end: 11 }]);
  });

  it('finds matches across multiple paragraphs', () => {
    const editor = makeGfmTestEditor();
    importMarkdown(editor, 'alpha\n\nbeta alpha');

    const matches = editor
      .getEditorState()
      .read(() => $getTextMatchRanges('alpha'));

    expect(matches).toEqual([
      { start: 0, end: 5 },
      { start: 12, end: 17 },
    ]);
  });
});
