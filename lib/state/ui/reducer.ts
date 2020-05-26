import { combineReducers } from 'redux';

import { toggleSystemTag } from '../domain/notes';

import * as A from '../action-types';
import * as T from '../../types';

const emptyList: unknown[] = [];

const dialogs: A.Reducer<T.DialogType[]> = (state = [], action) => {
  switch (action.type) {
    case 'CLOSE_DIALOG':
      return state.slice(0, -1);

    case 'SHOW_DIALOG':
      return state.includes(action.dialog) ? state : [...state, action.dialog];

    default:
      return state;
  }
};

const editMode: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'TOGGLE_EDIT_MODE': {
      return !state;
    }
    case 'CREATE_NOTE':
      return true;
    default:
      return state;
  }
};

const editingTags: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'TAG_EDITING_TOGGLE':
      return !state;
    case 'OPEN_NOTE':
    case 'SELECT_NOTE':
    case 'OPEN_TAG':
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
    case 'NAVIGATION_TOGGLE':
      return false;
    default:
      return state;
  }
};

const filteredNotes: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => ('FILTER_NOTES' === action.type ? action.noteIds : state);

const listTitle: A.Reducer<T.TranslatableString> = (
  state = 'All Notes',
  action
) => {
  switch (action.type) {
    case 'SHOW_ALL_NOTES':
      return 'All Notes';
    case 'SELECT_TRASH':
      return 'Trash';
    case 'OPEN_TAG':
      return action.tag.data.name;
    default:
      return state;
  }
};

const noteRevisions: A.Reducer<T.NoteEntity[]> = (
  state = emptyList as T.NoteEntity[],
  action
) => {
  switch (action.type) {
    case 'STORE_REVISIONS':
      return action.revisions;
    case 'CREATE_NOTE':
    case 'OPEN_NOTE':
    case 'SELECT_NOTE':
      return emptyList as T.NoteEntity[];
    default:
      return state;
  }
};

const openedNote: A.Reducer<T.EntityId | null> = (state = null, action) => {
  switch (action.type) {
    case 'OPEN_NOTE':
      return action.noteId;

    case 'CLOSE_NOTE':
      return null;

    default:
      return state;
  }
};

const openedTag: A.Reducer<T.TagEntity | null> = (state = null, action) => {
  switch (action.type) {
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
      return null;
    case 'OPEN_TAG':
      return action.tag;
    default:
      return state;
  }
};

const selectedRevision: A.Reducer<T.NoteEntity | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'SELECT_REVISION':
      return action.revision;
    case 'CREATE_NOTE':
    case 'OPEN_NOTE':
    case 'REVISIONS_TOGGLE':
    case 'SELECT_NOTE':
      return null;
    default:
      return state;
  }
};

const showNoteList: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'NOTE_LIST_TOGGLE':
      return !state;

    case 'OPEN_NOTE':
      return false;

    default:
      return state;
  }
};

const unsyncedNoteIds: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => ('SET_UNSYNCED_NOTE_IDS' === action.type ? action.noteIds : state);

const searchQuery: A.Reducer<string> = (state = '', action) => {
  switch (action.type) {
    case 'CREATE_NOTE':
      return '';
    case 'SEARCH':
      return action.searchQuery;
    default:
      return state;
  }
};

const simperiumConnected: A.Reducer<boolean> = (state = false, action) =>
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE' === action.type
    ? action.simperiumConnected
    : state;

const showNoteInfo: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'NOTE_INFO_TOGGLE':
      return !state;

    case 'NAVIGATION_TOGGLE':
      return false;

    default:
      return state;
  }
};

const showNavigation: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'NAVIGATION_TOGGLE':
      return !state;

    case 'OPEN_TAG':
    case 'SELECT_TRASH':
    case 'SHOW_ALL_NOTES':
      return false;
    case 'SHOW_DIALOG':
      if (action.dialog === 'SETTINGS') {
        return false;
      }
      return state;
    default:
      return state;
  }
};

const showRevisions: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'REVISIONS_TOGGLE':
      return !state;
    case 'OPEN_NOTE':
    case 'SELECT_NOTE':
    case 'CREATE_NOTE':
      return false;
    default:
      return state;
  }
};

const showTrash: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'SELECT_TRASH':
      return true;
    case 'CREATE_NOTE':
    case 'OPEN_TAG':
    case 'SHOW_ALL_NOTES': {
      return false;
    }
    default:
      return state;
  }
};

const tagSuggestions: A.Reducer<T.TagEntity[]> = (
  state = emptyList as T.TagEntity[],
  action
) => ('FILTER_NOTES' === action.type ? action.tags : state);

export default combineReducers({
  dialogs,
  editMode,
  editingTags,
  filteredNotes,
  listTitle,
  noteRevisions,
  openedNote,
  openedTag,
  searchQuery,
  selectedRevision,
  showNavigation,
  showNoteInfo,
  showNoteList,
  showRevisions,
  showTrash,
  simperiumConnected,
  tagSuggestions,
  unsyncedNoteIds,
});
