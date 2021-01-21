import type * as A from '../action-types';
import type * as T from '../../types';

export const closeDialog: A.ActionCreator<A.CloseDialog> = () => ({
  type: 'CLOSE_DIALOG',
});

export const closeNote: A.ActionCreator<A.CloseNote> = () => ({
  type: 'CLOSE_NOTE',
});

export const closeWindow: A.ActionCreator<A.CloseWindow> = () => ({
  type: 'CLOSE_WINDOW',
});

export const createNote: A.ActionCreator<A.CreateNote> = (
  note?: Partial<T.Note>
) => ({
  type: 'CREATE_NOTE',
  note: note,
});

export const dismissEmailVerifyDialog: A.ActionCreator<A.DismissEmailVerifyDialog> = () => ({
  type: 'DISMISS_EMAIL_VERIFY_DIALOG',
});

export const deleteOpenNoteForever: A.ActionCreator<A.DeleteOpenNoteForever> = () => ({
  type: 'DELETE_OPEN_NOTE_FOREVER',
});

export const emptyTrash: A.ActionCreator<A.EmptyTrash> = () => ({
  type: 'EMPTY_TRASH',
});

export const filterNotes: A.ActionCreator<A.FilterNotes> = (
  noteIds: T.EntityId[],
  tagHashes: T.TagHash[]
) => ({
  type: 'FILTER_NOTES',
  noteIds,
  tagHashes,
});

export const focusSearchField: A.ActionCreator<A.FocusSearchField> = () => ({
  type: 'FOCUS_SEARCH_FIELD',
});

export const logout: A.ActionCreator<A.Logout> = () => ({
  type: 'LOGOUT',
});

export const openNote: A.ActionCreator<A.OpenNote> = (noteId?: T.EntityId) => ({
  type: 'OPEN_NOTE',
  noteId,
});

export const openTag: A.ActionCreator<A.OpenTag> = (tagName: T.TagName) => ({
  type: 'OPEN_TAG',
  tagName,
});

export const reallyLogOut: A.ActionCreator<A.ReallyLogOut> = () => ({
  type: 'REALLY_LOGOUT',
});

export const restoreOpenNote: A.ActionCreator<A.RestoreOpenNote> = () => ({
  type: 'RESTORE_OPEN_NOTE',
});

export const selectNoteAbove: A.ActionCreator<A.SelectNoteAbove> = () => ({
  type: 'SELECT_NOTE_ABOVE',
});

export const selectNoteBelow: A.ActionCreator<A.SelectNoteBelow> = () => ({
  type: 'SELECT_NOTE_BELOW',
});

export const selectTrash: A.ActionCreator<A.SelectTrash> = () => ({
  type: 'SELECT_TRASH',
});

export const showAllNotes: A.ActionCreator<A.ShowAllNotes> = () => ({
  type: 'SHOW_ALL_NOTES',
});

export const showDialog: A.ActionCreator<A.ShowDialog> = (
  dialog: T.DialogType
) => ({
  type: 'SHOW_DIALOG',
  dialog,
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

export const search: A.ActionCreator<A.Search> = (searchQuery: string) => ({
  type: 'SEARCH',
  searchQuery,
});

export const selectNote: A.ActionCreator<A.SelectNote> = (
  noteId: T.EntityId
) => ({ type: 'SELECT_NOTE', noteId });

export const toggleEditMode: A.ActionCreator<A.ToggleEditMode> = () => ({
  type: 'TOGGLE_EDIT_MODE',
});

export const toggleNavigation: A.ActionCreator<A.ToggleNavigation> = () => ({
  type: 'NAVIGATION_TOGGLE',
});

export const toggleNoteList: A.ActionCreator<A.ToggleNoteList> = () => ({
  type: 'NOTE_LIST_TOGGLE',
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

export const trashOpenNote: A.ActionCreator<A.TrashOpenNote> = () => ({
  type: 'TRASH_OPEN_NOTE',
});
