import { escapeRegExp } from 'lodash';

import { getTerms } from '../utils/filter-notes';

export type SearchSegment = {
  text: string;
  isMatch: boolean;
};

/**
 * Splits text into segments that do and don't match the terms of a search query.
 *
 * Like the editor and the Markdown preview, each term matches on its own and
 * ignores case. Matches that overlap or touch are merged into one segment.
 */
export const splitSearchMatches = (
  text: string,
  searchQuery: string
): SearchSegment[] => {
  const ranges: Array<[number, number]> = [];

  getTerms(searchQuery)
    .filter((term) => term.trim().length > 0)
    .forEach((term) => {
      for (const match of text.matchAll(
        new RegExp(escapeRegExp(term), 'giu')
      )) {
        ranges.push([match.index, match.index + match[0].length]);
      }
    });

  if (ranges.length === 0) {
    return text ? [{ text, isMatch: false }] : [];
  }

  ranges.sort(([a], [b]) => a - b);

  const segments: SearchSegment[] = [];
  let position = 0;
  let [start, end] = ranges[0];

  const pushMatch = () => {
    if (start > position) {
      segments.push({ text: text.slice(position, start), isMatch: false });
    }
    segments.push({ text: text.slice(start, end), isMatch: true });
    position = end;
  };

  ranges.slice(1).forEach(([nextStart, nextEnd]) => {
    if (nextStart <= end) {
      end = Math.max(end, nextEnd);
      return;
    }

    pushMatch();
    [start, end] = [nextStart, nextEnd];
  });
  pushMatch();

  if (position < text.length) {
    segments.push({ text: text.slice(position), isMatch: false });
  }

  return segments;
};
