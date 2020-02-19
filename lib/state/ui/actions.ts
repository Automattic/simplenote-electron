import * as A from '../action-types';
import * as T from '../../types';

export const createNote: A.ActionCreator<A.CreateNote> = () => ({
  type: 'CREATE_NOTE',
});

export const closeNote: A.ActionCreator<A.CloseNote> = () => ({
  type: 'CLOSE_NOTE',
});

export const filterNotes: A.ActionCreator<A.FilterNotes> = (
  notes: T.NoteEntity[]
) => ({
  type: 'FILTER_NOTES',
  notes,
});

export const focusSearchField: A.ActionCreator<A.FocusSearchField> = () => ({
  type: 'FOCUS_SEARCH_FIELD',
});

export const setUnsyncedNoteIds: A.ActionCreator<A.SetUnsyncedNoteIds> = (
  noteIds: T.EntityId[]
) => ({
  type: 'SET_UNSYNCED_NOTE_IDS',
  noteIds,
});

export const toggleRevisions: A.ActionCreator<A.ToggleRevisions> = () => ({
  type: 'REVISIONS_TOGGLE',
});

export const toggleSimperiumConnectionStatus: A.ActionCreator<A.ToggleSimperiumConnectionStatus> = (
  simperiumConnected: boolean
) => ({
  type: 'SIMPERIUM_CONNECTION_STATUS_TOGGLE',
  simperiumConnected,
});

export const search: A.ActionCreator<A.Search> = (searchQuery: string) => ({
  type: 'SEARCH',
  searchQuery,
});

export const selectNote: A.ActionCreator<A.SelectNote> = (
  note: T.NoteEntity
) => ({ type: 'SELECT_NOTE', note });

export const toggleEditMode: A.ActionCreator<A.ToggleEditMode> = () => ({
  type: 'TOGGLE_EDIT_MODE',
});

export const toggleNoteInfo: A.ActionCreator<A.ToggleNoteInfo> = () => ({
  type: 'NOTE_INFO_TOGGLE',
});

export const toggleTagDrawer: A.ActionCreator<A.ToggleTagDrawer> = (
  show: boolean
) => ({
  type: 'TAG_DRAWER_TOGGLE',
  show,
});

export const toggleTagEditing: A.ActionCreator<A.ToggleTagEditing> = () => ({
  type: 'TAG_EDITING_TOGGLE',
});
