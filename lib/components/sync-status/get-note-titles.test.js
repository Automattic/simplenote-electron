import getNoteTitles from './get-note-titles';

describe('getNoteTitles', () => {
  const originalConsoleLog = console.log; // eslint-disable-line no-console

  afterEach(() => {
    global.console.log = originalConsoleLog;
  });

  it('should return the titles for the given note ids', () => {
    const result = getNoteTitles(
      ['foo', 'baz'],
      [
        { id: 'foo', data: { content: 'title\nexcerpt', systemTags: [] } },
        { id: 'bar' },
        { id: 'baz', data: { content: 'title\nexcerpt', systemTags: [] } },
      ]
    );
    expect(result).toEqual([
      { id: 'foo', title: 'title' },
      { id: 'baz', title: 'title' },
    ]);
  });

  it('should not choke on invalid ids', () => {
    global.console.log = jest.fn();
    const result = getNoteTitles(
      ['foo', 'bar'],
      [{ id: 'foo', data: { content: 'title', systemTags: [] } }]
    );
    expect(result).toEqual([{ id: 'foo', title: 'title' }]);
  });

  it('should return no more than `limit` items', () => {
    const limit = 1;
    const result = getNoteTitles(
      ['foo', 'bar'],
      [
        { id: 'foo', data: { content: 'title', systemTags: [] } },
        { id: 'bar' },
      ],
      limit
    );
    expect(result).toHaveLength(limit);
  });
});
