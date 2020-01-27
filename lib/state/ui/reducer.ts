import { difference, union } from 'lodash';
import { AnyAction, combineReducers } from 'redux';
import * as A from '../action-types';
import * as T from '../../types';

const defaultVisiblePanes = ['editor', 'noteList'];
const emptyList: unknown[] = [];

const filteredNotes: A.Reducer<T.NoteEntity[]> = (
  state = emptyList as T.NoteEntity[],
  action
) => ('FILTER_NOTES' === action.type ? action.notes : state);

const simperiumConnected: A.Reducer<boolean> = (state = false, action) =>
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE' === action.type
    ? action.simperiumConnected
    : state;

const visiblePanes: A.Reducer<string[]> = (
  state = defaultVisiblePanes,
  action
) => {
  if ('TAG_DRAWER_TOGGLE' === action.type) {
    return action.show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

const note: A.Reducer<T.NoteEntity | null> = (
  state = null,
  action: AnyAction
) => {
  switch (action.type) {
    case 'App.notesLoaded': {
      return state
        ? action.notes.find(({ id }) => id === state.id) || state
        : action.notes[0] || null;
    }
    case 'App.noteUpdatedRemotely':
    case 'App.selectNote': {
      return {
        ...action.note,
        hasRemoteUpdate: action.hasRemoteUpdate,
      };
    }
    case 'App.closeNote':
    case 'App.showAllNotes':
    case 'App.selectTrash':
    case 'App.selectTag':
      return null;
    case 'SET_SELECTED_NOTE':
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
  visiblePanes,
});
