import { combineReducers } from 'redux';

import * as A from '../action-types';
import * as T from '../../types';

export const analyticsAllowed: A.Reducer<boolean | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'SET_ANALYTICS':
      return action.allowAnalytics;

    default:
      return state;
  }
};

export const notes: A.Reducer<Map<T.EntityId, T.Note>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'CREATE_NOTE_WITH_ID':
      return new Map(state).set(action.noteId, {
        content: '',
        creationDate: Date.now() / 1000,
        modificationDate: Date.now() / 1000,
        deleted: false,
        publishURL: '',
        shareURL: '',
        systemTags: [],
        tags: [],
      });

    case 'EDIT_NOTE':
      return state.has(action.noteId)
        ? new Map(state).set(action.noteId, {
            ...state.get(action.noteId)!,
            ...action.changes,
          })
        : state;

    default:
      return state;
  }
};

export default combineReducers({
  analyticsAllowed,
  notes,
});
