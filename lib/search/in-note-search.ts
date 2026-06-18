import { getTerms } from '../utils/filter-notes';

export type TextMatchRange = {
  end: number;
  start: number;
};

export function getSearchTerms(searchQuery: string): string[] {
  return getTerms(searchQuery)
    .map((term) => term.normalize().toLowerCase())
    .filter((term) => term.trim().length > 0);
}

export function findTextMatchRanges(
  text: string,
  terms: string[]
): TextMatchRange[] {
  if (terms.length === 0 || text.length === 0) {
    return [];
  }

  const normalizedText = text.normalize().toLowerCase();
  const matches: TextMatchRange[] = [];

  for (const term of terms) {
    let fromIndex = 0;

    while (fromIndex < normalizedText.length) {
      const index = normalizedText.indexOf(term, fromIndex);
      if (-1 === index) {
        break;
      }

      matches.push({ start: index, end: index + term.length });
      fromIndex = index + 1;
    }
  }

  matches.sort(
    (left, right) => left.start - right.start || left.end - right.end
  );

  return matches;
}

export function getNextSearchMatchIndex(
  currentIndex: number | null,
  total: number
): number {
  return (total + (currentIndex ?? -1) + 1) % total;
}

export function getPrevSearchMatchIndex(
  currentIndex: number | null,
  total: number
): number {
  return (total + (currentIndex ?? total) - 1) % total;
}
