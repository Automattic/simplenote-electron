import * as A from '../action-types';
import * as T from '../../types';

export const filterNotes = (notes: T.NoteEntity[]): A.FilterNotes => ({
  type: 'FILTER_NOTES',
  notes,
});

export const toggleTagDrawer = (show: boolean): A.ToggleTagDrawer => ({
  type: 'TAG_DRAWER_TOGGLE',
  show,
});
