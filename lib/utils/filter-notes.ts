const tagPattern = () => /(?:\btag:)([^\s,]+)/g;

export const withoutTags = (s: string) => s.replace(tagPattern(), '').trim();

export const getTerms = (filterText: string): string[] => {
  if (!filterText) {
    return [];
  }

  const literalsPattern = /(?:")((?:"|[^"])+?)(?:")/g;
  const boundaryPattern = /[\b\s]/g;

  let match;
  let storedLastIndex = 0;
  let withoutLiterals = '';

  const filter = withoutTags(filterText);

  const literals = [];
  while ((match = literalsPattern.exec(filter)) !== null) {
    literals.push(match[0].slice(1, -1));

    // anything in between our last saved index and the current match index is a non-literal term
    // ex: for the search string [ "foo" bar "baz" ] we'll save "bar" as a non-literal here when we match "baz"
    withoutLiterals += filter.slice(storedLastIndex, match.index);

    // lastIndex is the end of the current match
    // (i.e., where in the string to start scanning for the next match)
    storedLastIndex = literalsPattern.lastIndex;
  }

  if (
    (storedLastIndex > 0 || literals.length === 0) &&
    storedLastIndex < filter.length
  ) {
    withoutLiterals += filter.slice(storedLastIndex);
  }

  const terms = withoutLiterals
    .split(boundaryPattern)
    .map((a) => a.trim())
    .filter((a) => a);

  return [...literals, ...terms];
};
