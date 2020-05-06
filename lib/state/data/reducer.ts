import { combineReducers } from 'redux';

import * as A from '../action-types';
import * as T from '../../types';

export const analyticsEnabled: A.Reducer<boolean | null> = (
  state = null,
  action
) => ('ALLOW_ANALYTICS' === action.type ? action.analyticsAllowed : state);

export const notes: A.Reducer<T.NoteEntities[] | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'ADD_NOTE':
      return state
        ? [...state, { id: action.noteId, data: action.data }]
        : [{ id: action.noteId, data: action.data }];

    case 'REMOVE_NOTE':
      return state ? state.filter(({ id }) => id !== action.noteId) : state;

    default:
      return state;
  }
};

export default combineReducers({
  notes,
});
