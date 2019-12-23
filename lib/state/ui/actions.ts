import {
  EDITOR_MODE_SET,
  FILTER_NOTES,
  TAG_DRAWER_TOGGLE,
} from '../action-types';

import * as T from '../../types';

export const filterNotes = notes => ({
  type: FILTER_NOTES,
  notes,
});

export const setEditorMode = (mode: T.EditorMode) => ({
  type: EDITOR_MODE_SET,
  mode,
});

export const toggleTagDrawer = (show: boolean) => ({
  type: TAG_DRAWER_TOGGLE,
  show,
});
