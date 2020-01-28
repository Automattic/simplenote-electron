import { difference, union } from 'lodash';
import { combineReducers } from 'redux';

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

export default combineReducers({
  filteredNotes,
  simperiumConnected,
  visiblePanes,
});
