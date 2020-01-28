import * as A from '../action-types';
import * as T from '../../types';

export const filterNotes: A.ActionCreator<A.FilterNotes> = (
  notes: T.NoteEntity[]
) => ({
  type: 'FILTER_NOTES',
  notes,
});

export const toggleShouldPrint: A.ActionCreator<A.ToggleShouldPrint> = (
  shouldPrint: boolean
) => ({
  type: 'SHOULD_PRINT_TOGGLE',
  shouldPrint,
});

export const toggleTagDrawer: A.ActionCreator<A.ToggleTagDrawer> = (
  show: boolean
) => ({
  type: 'TAG_DRAWER_TOGGLE',
  show,
});
