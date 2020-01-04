import { FILTER_NOTES, TAG_DRAWER_TOGGLE } from '../action-types';

export const filterNotes = notes => ({
  type: FILTER_NOTES,
  notes,
});

export const toggleTagDrawer = show => ({
  type: TAG_DRAWER_TOGGLE,
  show,
});
