/**
 * External dependencies
 */
import { difference, escapeRegExp, get } from 'lodash';
import { NoteEntity, TagEntity } from '../types';
import { AppState } from '../state';

const tagPattern = () => /(?:\btag:)([\w-]+)(?!\B)/g;

export const withoutTags = (s: string) => s.replace(tagPattern(), '').trim();
export const filterHasText = (filter: string) => !!withoutTags(filter);

const getTerms = (filterText: string) => {
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

export const searchPattern = (filter: string) => {
  const terms = getTerms(withoutTags(filter));

  if (!terms.length) {
    return new RegExp('.+', 'g');
  }

  return new RegExp(
    `(?:${terms.map(word => `(?:${escapeRegExp(word)})`).join('|')})`,
    'gi'
  );
};

const matchesTrashView = (isViewingTrash: boolean) => (note: NoteEntity) =>
  isViewingTrash === !!get(note, 'data.deleted', false);

const makeMatchesTag = (tag: TagEntity, filter = '') => (note: NoteEntity) => {
  let filterTags = [];
  let match;
  const matcher = tagPattern();

  while ((match = matcher.exec(filter)) !== null) {
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

const makeMatchesSearch = (filter = '') => (content: string) => {
  if (!filter) {
    return true;
  }

  if (!content) {
    return false;
  }

  return getTerms(filter).every(term =>
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
  state: AppState,
  notesArray: NoteEntity[] | null = null
) {
  const {
    filter, // {string} search query from input
    notes, // {[note]} list of all available notes
    showTrash, // {bool} whether we are looking at the trashed notes
    tag, // {tag|null} whether we are looking at a specific tag
  } = state;

  const notesToFilter = notesArray ? notesArray : notes;

  if (null === notesToFilter) {
    // share the reference so the app doesn't re-render on shallow-compare
    return (emptyList as unknown) as NoteEntity[];
  }

  // skip into some imperative code for performance-critical code
  const titleMatches: NoteEntity[] = [];
  const otherMatches: NoteEntity[] = [];

  // reuse these functions for each note
  const matchesTrash = matchesTrashView(showTrash);
  const matchesTag = makeMatchesTag(tag, filter);
  const matchesSearch = makeMatchesSearch(filter);
  const matchesFilter = (note: NoteEntity) =>
    matchesTrash(note) &&
    matchesTag(note) &&
    matchesSearch(get(note, ['data', 'content']));

  notesToFilter.forEach((note: NoteEntity) => {
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
