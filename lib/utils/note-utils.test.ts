import noteTitleAndPreview, {
  maxTitleChars,
  maxPreviewChars,
} from './note-utils';

describe('noteTitleAndPreview', () => {
  let note;

  beforeEach(() => {
    note = {
      content: '',
      systemTags: ['markdown'],
    };
  });

  it('should return default values if note content is empty', () => {
    const result = noteTitleAndPreview(note);
    expect(result).toEqual({ preview: '', title: 'New Note…' });
  });

  it('should return the title and preview when note is not Markdown', () => {
    note.content = 'My title\nThe preview';
    note.systemTags = [];
    const result = noteTitleAndPreview(note);
    expect(result).toEqual({
      title: 'My title',
      preview: 'The preview',
    });
  });

  it('should return the title and preview with Markdown removed when note is Markdown', () => {
    note.content = '# My title\nThe [preview](https://test.com)';
    const result = noteTitleAndPreview(note);
    expect(result).toEqual({
      title: 'My title',
      preview: 'The preview',
    });
  });

  // Test that it doesn't trigger the bug in `remove-markdown`
  // See https://github.com/stiang/remove-markdown/issues/35
  it('should complete in a reasonable amount of time', () => {
    const bugInducingString =
      '# aaa                                               bbb';
    note.content = bugInducingString + '\n' + bugInducingString;
    const count = 100;
    let sentinel = '';
    const tic = process.hrtime();
    for (let i = 0; i < count; i++) {
      sentinel += noteTitleAndPreview(note);
    }
    const [s, ns] = process.hrtime(tic);
    expect(sentinel.length).toBeGreaterThan(0);
    expect((s * 1000 + ns / 1000 / 1000) / count).toBeLessThan(1);
  });

  it('should have enough text for an Expanded preview, even if the title is very long', () => {
    // Longer than the char limits
    const title = 'A really long title'.repeat(100);
    const paragraph = 'A really long paragraph'.repeat(100);

    note.content = title + '\n' + paragraph;
    const result = noteTitleAndPreview(note);
    expect(result.title).toHaveLength(maxTitleChars);
    expect(result.preview).toHaveLength(maxPreviewChars);
  });
});
