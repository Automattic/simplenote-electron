import removeAccents from './remove-accents';

const tagPattern = () => /(?:\btag:)([^\s,]+)/g;

export const withoutTags = (s: string) => s.replace(tagPattern(), '').trim();

export const getTerms = (filterText: string): string[] => {
  if (!filterText) {
    return [];
  }

  const literalsPattern = /(?:")((?:"|[^"])+)(?:")/g;
  const boundaryPattern = /[\b\s]/g;

  let match;
  let withoutLiterals = '';

  const filter = removeAccents(withoutTags(filterText));

  const literals = [];
  while ((match = literalsPattern.exec(filter)) !== null) {
    literals.push(match[0].slice(1, -1));

    withoutLiterals += filter.slice(literalsPattern.lastIndex, match.index);
  }

  if (
    (literalsPattern.lastIndex > 0 || literals.length === 0) &&
    literalsPattern.lastIndex < filter.length
  ) {
    withoutLiterals += filter.slice(literalsPattern.lastIndex);
  }

  const terms = withoutLiterals
    .split(boundaryPattern)
    .map((a) => a.trim())
    .filter((a) => a);

  return [...literals, ...terms];
};
