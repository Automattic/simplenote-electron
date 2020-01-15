import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import { APPLY_SEARCH, TAG_DRAWER_TOGGLE } from '../action-types';

import * as T from '../../types';
import { NoteListItem } from '../../note-list';

const defaultVisiblePanes = ['editor', 'noteList'];
const emptyList: unknown[] = [];

const filteredNotes = (
  state = emptyList as T.NoteEntity[],
  { type, notes }: { type: string; notes: T.NoteEntity[] }
) => (APPLY_SEARCH === type ? notes : state);

const filteredTags = (
  state = emptyList as T.TagEntity[],
  { type, tags }: { type: string; tags: T.TagEntity[] }
): T.TagEntity[] => (APPLY_SEARCH === type ? tags : state);

const noteListItems = (
  state = emptyList as NoteListItem[],
  {
    type,
    filter,
    notes,
    tags,
  }: {
    type: string;
    filter: string;
    notes: T.NoteEntity[];
    tags: T.TagEntity[];
  }
): NoteListItem[] => {
  if (APPLY_SEARCH !== type) {
    return state;
  }

  if (filter.length === 0 || tags.length === 0) {
    return notes;
  }

  return [
    'tag-suggestions',
    'notes-header',
    ...(notes.length > 0 ? notes : (['no-notes'] as NoteListItem[])),
  ];
};

const visiblePanes = (state = defaultVisiblePanes, { type, show }) => {
  if (TAG_DRAWER_TOGGLE === type) {
    return show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

export default combineReducers({
  filteredNotes,
  filteredTags,
  noteListItems,
  visiblePanes,
});
