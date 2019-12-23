import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import {
  EDITOR_MODE_SET,
  FILTER_NOTES,
  TAG_DRAWER_TOGGLE,
} from '../action-types';

import * as T from '../../types';

const defaultVisiblePanes = ['editor', 'noteList'];
const emptyList: unknown[] = [];

const editorMode = (
  state: T.EditorMode = 'edit',
  { type, mode }: { type: string; mode: T.EditorMode }
): T.EditorMode => {
  switch (type) {
    case 'App.newNote':
      return 'edit';
    case EDITOR_MODE_SET:
      return mode;
    default:
      return state;
  }
};

const filteredNotes = (
  state = emptyList as T.NoteEntity[],
  { type, notes }: { type: string; notes: T.NoteEntity[] }
) => (FILTER_NOTES === type ? notes : state);

const visiblePanes = (state = defaultVisiblePanes, { type, show }) => {
  if (TAG_DRAWER_TOGGLE === type) {
    return show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

export default combineReducers({ editorMode, filteredNotes, visiblePanes });
