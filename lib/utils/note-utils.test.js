import noteTitleAndPreview, { normalizeForSorting } from './note-utils';

describe('noteTitleAndPreview', () => {
  let note;

  beforeEach(() => {
    note = {
      data: {
        content: '',
        systemTags: ['markdown'],
      },
    };
  });

  it('should return default values if note content is empty', () => {
    const result = noteTitleAndPreview(note);
    expect(result).toEqual({ preview: '', title: 'New Note…' });
  });

  it('should return the title and preview when note is not Markdown', () => {
    note.data.content = 'My title\nThe preview';
    note.data.systemTags = [];
    const result = noteTitleAndPreview(note);
    expect(result).toEqual({
      title: 'My title',
      preview: 'The preview',
    });
  });

  it('should return the title and preview with Markdown removed when note is Markdown', () => {
    note.data.content = '# My title\nThe [preview](https://test.com)';
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
    note.data.content = bugInducingString + '\n' + bugInducingString;
    const startTime = Date.now();
    noteTitleAndPreview(note);
    const elapsedMs = Date.now() - startTime;
    expect(elapsedMs).toBeLessThanOrEqual(1);
  });

  it('should have enough text for an Expanded preview, even if the title is very long', () => {
    // Longer than the char limits
    const title = 'foo'.repeat(64);
    const paragraph = 'foo'.repeat(200);

    note.data.content = title + '\n' + paragraph;
    const result = noteTitleAndPreview(note);
    expect(result.title).toHaveLength(64);
    expect(result.preview).toHaveLength(200);
  });
});

describe('normalizeForSorting', () => {
  it('should remove accents and diacritics', () => {
    expect(normalizeForSorting('àéïñ')).toBe('aein');
  });

  it('should not choke when String.prototype.normalize() is not implemented', () => {
    const originalNormalize = String.prototype.normalize;
    String.prototype.normalize = undefined; // Not implemented in IE11
    expect(normalizeForSorting('à')).toBe('à');
    String.prototype.normalize = originalNormalize;
  });

  it('should remove leading whitespace', () => {
    expect(normalizeForSorting('\tfoo')).toBe('foo');
  });

  it('should remove Markdown headings in the first line', () => {
    expect(normalizeForSorting('# title')).toBe('title');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeForSorting('foo   bar')).toBe('foo bar');
  });

  it('should lowercase the whole string', () => {
    expect(normalizeForSorting('FOO')).toBe('foo');
  });
});
