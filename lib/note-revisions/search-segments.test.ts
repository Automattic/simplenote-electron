import { splitSearchMatches } from './search-segments';

describe('splitSearchMatches', () => {
  it('returns the whole text as one segment without a search', () => {
    expect(splitSearchMatches('Plain note', '')).toEqual([
      { text: 'Plain note', isMatch: false },
    ]);
  });

  it('matches each term on its own, ignoring case', () => {
    expect(
      splitSearchMatches('Buy milk, then MILK the cow', 'milk cow')
    ).toEqual([
      { text: 'Buy ', isMatch: false },
      { text: 'milk', isMatch: true },
      { text: ', then ', isMatch: false },
      { text: 'MILK', isMatch: true },
      { text: ' the ', isMatch: false },
      { text: 'cow', isMatch: true },
    ]);
  });

  it('matches a quoted phrase as one term and ignores tag filters', () => {
    expect(
      splitSearchMatches('a red car and a car', 'tag:work "red car"')
    ).toEqual([
      { text: 'a ', isMatch: false },
      { text: 'red car', isMatch: true },
      { text: ' and a car', isMatch: false },
    ]);
  });

  it('merges matches that overlap or touch', () => {
    expect(splitSearchMatches('notebook', 'note ebo book')).toEqual([
      { text: 'notebook', isMatch: true },
    ]);
  });

  it('treats regular expression characters in a term literally', () => {
    expect(splitSearchMatches('cost: $5 (approx.)', '$5 (approx.)')).toEqual([
      { text: 'cost: ', isMatch: false },
      { text: '$5', isMatch: true },
      { text: ' ', isMatch: false },
      { text: '(approx.)', isMatch: true },
    ]);
  });
});
