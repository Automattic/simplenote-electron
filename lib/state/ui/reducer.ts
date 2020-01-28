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

const print: A.Reducer<boolean> = (state = false, action) =>
  'SHOULD_PRINT_TOGGLE' === action.type ? action.shouldPrint : state;

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

export default combineReducers({ filteredNotes, print, visiblePanes });
