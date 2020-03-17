import * as A from '../action-types';
import * as T from '../../types';

export const createNote: A.ActionCreator<A.CreateNote> = () => ({
  type: 'CREATE_NOTE',
});

export const closeNote: A.ActionCreator<A.CloseNote> = () => ({
  type: 'CLOSE_NOTE',
});

export const deleteNoteForever: A.ActionCreator<A.DeleteNoteForever> = (
  previousIndex: number
) => ({
  type: 'DELETE_NOTE_FOREVER',
  previousIndex,
});

export const filterNotes: A.ActionCreator<A.FilterNotes> = (
  notes: T.NoteEntity[],
  previousIndex: number
) => ({
  type: 'FILTER_NOTES',
  notes,
  previousIndex,
});

export const focusSearchField: A.ActionCreator<A.FocusSearchField> = () => ({
  type: 'FOCUS_SEARCH_FIELD',
});

export const markdownNote: A.ActionCreator<A.SetSystemTag> = (
  note: T.NoteEntity,
  isMarkdown: boolean
) => ({
  type: 'SET_SYSTEM_TAG',
  note,
  tagName: 'markdown',
  shouldHaveTag: isMarkdown,
});

export const pinNote: A.ActionCreator<A.SetSystemTag> = (
  note: T.NoteEntity,
  shouldPin: boolean
) => ({
  type: 'SET_SYSTEM_TAG',
  note,
  tagName: 'pinned',
  shouldHaveTag: shouldPin,
});

export const publishNote: A.ActionCreator<A.SetSystemTag> = (
  note: T.NoteEntity,
  shoudlPublish: boolean
) => ({
  type: 'SET_SYSTEM_TAG',
  note,
  tagName: 'published',
  shouldHaveTag: shoudlPublish,
});

export const openTag: A.ActionCreator<A.OpenTag> = (tag: T.TagEntity) => ({
  type: 'OPEN_TAG',
  tag,
});

export const restoreNote: A.ActionCreator<A.RestoreNote> = (
  previousIndex: number
) => ({
  type: 'RESTORE_NOTE',
  previousIndex,
});

export const selectRevision: A.ActionCreator<A.SelectRevision> = (
  revision: T.NoteEntity
) => ({
  type: 'SELECT_REVISION',
  revision,
});

export const setUnsyncedNoteIds: A.ActionCreator<A.SetUnsyncedNoteIds> = (
  noteIds: T.EntityId[]
) => ({
  type: 'SET_UNSYNCED_NOTE_IDS',
  noteIds,
});

export const storeRevisions: A.ActionCreator<A.StoreRevisions> = (
  noteId: T.EntityId,
  revisions: T.NoteEntity[]
) => ({
  type: 'STORE_REVISIONS',
  noteId,
  revisions,
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

export const toggleNavigation: A.ActionCreator<A.ToggleNavigation> = () => ({
  type: 'NAVIGATION_TOGGLE',
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

export const trashNote: A.ActionCreator<A.TrashNote> = (
  previousIndex: number
) => ({
  type: 'TRASH_NOTE',
  previousIndex,
});
