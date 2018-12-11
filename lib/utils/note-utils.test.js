import noteTitleAndPreview, { defaults } from './note-utils';

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
    expect(result).toEqual(defaults);
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
});
