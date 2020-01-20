import { FILTER_NOTES, TAG_DRAWER_TOGGLE } from '../action-types';

import * as T from '../../types';

export const filterNotes = (notes: T.NoteEntity[]) => ({
  type: FILTER_NOTES,
  notes,
});

export const toggleTagDrawer = (show: boolean) => ({
  type: TAG_DRAWER_TOGGLE,
  show,
});
