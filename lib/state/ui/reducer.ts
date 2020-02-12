import { combineReducers } from 'redux';

import * as set from '../../utils/set-utils';

import * as A from '../action-types';
import * as T from '../../types';

const emptyList: unknown[] = [];

const filteredNotes: A.Reducer<T.NoteEntity[]> = (
  state = emptyList as T.NoteEntity[],
  action
) => ('FILTER_NOTES' === action.type ? action.notes : state);

const unsyncedNoteIds: A.Reducer<T.EntityId[]> = (
  state = emptyList as T.EntityId[],
  action
) => ('SET_UNSYNCED_NOTE_IDS' === action.type ? action.noteIds : state);

const simperiumConnected: A.Reducer<boolean> = (state = false, action) =>
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE' === action.type
    ? action.simperiumConnected
    : state;

const visiblePanes: A.Reducer<Set<string>> = (
  state = new Set(['editor', 'noteList']),
  action
) => {
  if ('TAG_DRAWER_TOGGLE' === action.type) {
    return action.show
      ? set.include(state, 'tagDrawer')
      : set.exclude(state, 'tagDrawer');
  }

  return state;
};

const note: A.Reducer<T.NoteEntity | null> = (state = null, action) => {
  switch (action.type) {
    case 'App.selectNote':
      return { ...action.note, hasRemoteUpdate: action.hasRemoteUpdate };
    case 'App.closeNote':
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
  filteredNotes,
  note,
  simperiumConnected,
  unsyncedNoteIds,
  visiblePanes,
});
