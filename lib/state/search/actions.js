import { FILTER_NOTES, RESET_SEARCH, SEARCH_NOTES } from '../action-types';

export const filterNotes = visibleNoteIds => ({
  type: FILTER_NOTES,
  visibleNoteIds,
});

export const resetSearch = () => ({ type: RESET_SEARCH });

export const searchNotes = ( query, { debounce = false } ) => ({ type: SEARCH_NOTES, query, debounce });
