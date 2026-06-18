import {
  findTextMatchRanges,
  getNextSearchMatchIndex,
  getPrevSearchMatchIndex,
  getSearchTerms,
} from './in-note-search';

describe('getSearchTerms', () => {
  it('normalizes and lowercases terms', () => {
    expect(getSearchTerms('  Foo  BAR  ')).toEqual(['foo', 'bar']);
  });

  it('extracts quoted literals', () => {
    expect(getSearchTerms('"Hello World" test')).toEqual([
      'hello world',
      'test',
    ]);
  });

  it('ignores tag filters', () => {
    expect(getSearchTerms('tag:work hello')).toEqual(['hello']);
  });
});

describe('findTextMatchRanges', () => {
  it('finds case-insensitive matches', () => {
    expect(findTextMatchRanges('Hello hello', ['hello'])).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 11 },
    ]);
  });

  it('finds multiple terms', () => {
    expect(findTextMatchRanges('alpha beta alpha', ['alpha', 'beta'])).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 10 },
      { start: 11, end: 16 },
    ]);
  });

  it('returns an empty list when there are no terms', () => {
    expect(findTextMatchRanges('hello', [])).toEqual([]);
  });
});

describe('search match navigation', () => {
  it('wraps to the first match when advancing past the end', () => {
    expect(getNextSearchMatchIndex(2, 3)).toBe(0);
  });

  it('wraps to the last match when moving backward from the start', () => {
    expect(getPrevSearchMatchIndex(null, 3)).toBe(2);
  });
});
