import * as A from '../action-types';
import * as T from '../../types';

export const createNote: A.ActionCreator<A.CreateNote> = () => ({
  type: 'CREATE_NOTE',
});

export const filterNotes: A.ActionCreator<A.FilterNotes> = (
  notes: T.NoteEntity[]
) => ({
  type: 'FILTER_NOTES',
  notes,
});

export const setUnsyncedNoteIds: A.ActionCreator<A.SetUnsyncedNoteIds> = (
  noteIds: T.EntityId[]
) => ({
  type: 'SET_UNSYNCED_NOTE_IDS',
  noteIds,
});

export const toggleSimperiumConnectionStatus: A.ActionCreator<A.ToggleSimperiumConnectionStatus> = (
  simperiumConnected: boolean
) => ({
  type: 'SIMPERIUM_CONNECTION_STATUS_TOGGLE',
  simperiumConnected,
});

export const selectNote: A.ActionCreator<A.SelectNote> = (
  note: T.NoteEntity
) => ({ type: 'SELECT_NOTE', note });

export const toggleEditMode: A.ActionCreator<A.ToggleEditMode> = () => ({
  type: 'TOGGLE_EDIT_MODE',
});

export const toggleTagDrawer: A.ActionCreator<A.ToggleTagDrawer> = (
  show: boolean
) => ({
  type: 'TAG_DRAWER_TOGGLE',
  show,
});
