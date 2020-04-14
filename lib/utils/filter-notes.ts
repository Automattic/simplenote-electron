/**
 * External dependencies
 */
import { difference, escapeRegExp, get } from 'lodash';

import * as S from '../state';
import * as T from '../types';

const tagPattern = () => /(?:\btag:)([^\s,]+)/g;

export const withoutTags = (s: string) => s.replace(tagPattern(), '').trim();
export const filterHasText = (searchQuery: string) =>
  !!withoutTags(searchQuery);

export const getTerms = (filterText: string): string[] => {
  if (!filterText) {
    return [];
  }

  const literalsPattern = /(?:")((?:"|[^"])+)(?:")/g;
  const boundaryPattern = /[\b\s]/g;

  let match;
  let withoutLiterals = '';

  const filter = withoutTags(filterText);

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
    .map(a => a.trim())
    .filter(a => a);

  return [...literals, ...terms];
};

export const searchPattern = (searchQuery: string) => {
  const terms = getTerms(withoutTags(searchQuery));

  if (!terms.length) {
    return new RegExp('.+', 'g');
  }

  return new RegExp(
    `(?:${terms.map(word => `(?:${escapeRegExp(word)})`).join('|')})`,
    'gi'
  );
};

const matchesTrashView = (isViewingTrash: boolean) => (note: T.NoteEntity) =>
  isViewingTrash === !!get(note, 'data.deleted', false);

const makeMatchesTag = (tag: T.TagEntity | null, searchQuery = '') => (
  note: T.NoteEntity
) => {
  let filterTags = [];
  let match;
  const matcher = tagPattern();

  while ((match = matcher.exec(searchQuery)) !== null) {
    filterTags.push(match[1]);

    if (filterTags.length > 100) {
      break;
    }
  }

  const givenTag = tag ? [get(tag, 'data.name', '')] : [];

  const noteTags = get(note, 'data.tags', []);

  const missingTags = difference([...filterTags, ...givenTag], noteTags);

  return missingTags.length === 0;
};

const makeMatchesSearch = (searchQuery = '') => (content: string) => {
  if (!searchQuery) {
    return true;
  }

  if (!content) {
    return false;
  }

  return getTerms(searchQuery).every(term =>
    new RegExp(escapeRegExp(term), 'gi').test(content)
  );
};

const emptyList = Object.freeze([]);

/**
 * Filters notes with the current search criteria
 *
 * @TODO: Remove shadowing by renaming search functions
 * @TODO: Pre-index note title in domains/note
 */
export default function filterNotes(
  state: S.State,
  notesArray: T.NoteEntity[] | null = null
) {
  const {
    notes,
    ui: { openedTag, searchQuery, showTrash },
  } = state;

  const notesToFilter = notesArray ? notesArray : notes;

  if (null === notesToFilter) {
    // share the reference so the app doesn't re-render on shallow-compare
    return (emptyList as unknown) as T.NoteEntity[];
  }

  // skip into some imperative code for performance-critical code
  const titleMatches: T.NoteEntity[] = [];
  const otherMatches: T.NoteEntity[] = [];

  // reuse these functions for each note
  const matchesTrash = matchesTrashView(showTrash);
  const matchesTag = makeMatchesTag(openedTag, searchQuery);
  const matchesSearch = makeMatchesSearch(searchQuery);
  const matchesFilter = (note: T.NoteEntity) =>
    matchesTrash(note) &&
    matchesTag(note) &&
    matchesSearch(get(note, ['data', 'content']));

  notesToFilter.forEach((note: T.NoteEntity) => {
    if (!matchesFilter(note)) {
      return;
    }

    // the search matches the note but we want to prioritize
    // results that match the search query in the "title"
    const title = get(note, ['data', 'content'], '').split('\n')[0];

    if (matchesSearch(title)) {
      titleMatches.push(note);
    } else {
      otherMatches.push(note);
    }
  });

  return titleMatches.concat(otherMatches);
}
