import { combineReducers } from 'redux';
import * as A from '../action-types';
import * as T from '../../types';

const notes: A.Reducer<Map<T.EntityId, T.NoteEntity> | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    default:
      return state;
  }
};

export default combineReducers({ notes });
