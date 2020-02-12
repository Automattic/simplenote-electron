import { combineReducers } from 'redux';
import * as A from '../action-types';
import * as T from '../../types';

const defaultVisiblePanes = new Set(['editor', 'noteList']);
const emptyList: unknown[] = [];

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

const filteredNotes: A.Reducer<T.NoteEntity[]> = (
  state = emptyList as T.NoteEntity[],
  action
) => ('FILTER_NOTES' === action.type ? action.notes : state);

const listTitle: A.Reducer<T.TranslatableString> = (
  state = 'All Notes',
  action
) => {
  switch (action.type) {
    case 'App.showAllNotes':
      return 'All Notes';
    case 'App.selectTrash':
      return 'Trash';
    case 'App.selectTag':
      return action.tag.data.name;
    default:
      return state;
  }
};

const unsyncedNoteIds: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => ('SET_UNSYNCED_NOTE_IDS' === action.type ? action.noteIds : state);

const searchQuery: A.Reducer<string> = (state = '', action) =>
  'SEARCH' === action.type ? action.searchQuery : state;

const simperiumConnected: A.Reducer<boolean> = (state = false, action) =>
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE' === action.type
    ? action.simperiumConnected
    : state;

const visiblePanes: A.Reducer<Set<string>> = (
  state = defaultVisiblePanes,
  action
) => {
  console.log(action.type);
  switch (action.type) {
    case 'CLOSE_NOTE': {
      return new Set(state).add('noteList');
    }
    case 'App.selectNote': {
      const newSet = new Set(state);
      newSet.delete('noteList');
      return newSet;
    }
    case 'NOTE_LIST_TOGGLE':
      if (action.show) {
        return new Set(state).add('noteList');
      } else {
        const newSet = new Set(state);
        newSet.delete('noteList');
        return newSet;
      }
    case 'TAG_DRAWER_TOGGLE': {
      if (action.show) {
        return new Set(state).add('tagDrawer');
      } else {
        const newSet = new Set(state);
        newSet.delete('tagDrawer');
        return newSet;
      }
    }
    default:
      return state;
  }
};

const showNoteInfo: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'NOTE_INFO_TOGGLE':
      return !state;

    case 'App.toggleNavigation':
      return false;

    default:
      return state;
  }
};

const note: A.Reducer<T.NoteEntity | null> = (state = null, action) => {
  switch (action.type) {
    case 'App.selectNote':
      return { ...action.note, hasRemoteUpdate: action.hasRemoteUpdate };
    case 'CLOSE_NOTE':
    case 'App.trashNote':
    case 'App.emptyTrash':
    case 'App.showAllNotes':
    case 'App.selectTrash':
    case 'App.selectTag':
      return null;
    case 'SELECT_NOTE':
      return action.note;
    case 'FILTER_NOTES':
      // keep note if still in new filtered list otherwise try to choose first note in list
      return state && action.notes.some(({ id }) => id === state.id)
        ? state
        : action.notes[0] || null;
    default:
      return state;
  }
};

export default combineReducers({
  editMode,
  filteredNotes,
  listTitle,
  note,
  searchQuery,
  showNoteInfo,
  simperiumConnected,
  unsyncedNoteIds,
  visiblePanes,
});
