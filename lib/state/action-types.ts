import * as T from '../types';

import { AuthState } from './auth/constants';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: unknown } = {}
> = { type: T } & Args;

/*
 * Legacy action-creators that are more like global setters than Redux actions
 */
export type SetAccountName = Action<'setAccountName', { accountName: string }>;
export type SetAutoHideMenuBar = Action<
  'setAutoHideMenuBar',
  { autoHideMenuBar: boolean }
>;
export type SetFocusMode = Action<
  'setFocusMode',
  { focusModeEnabled: boolean }
>;
export type SetFontSize = Action<'setFontSize', { fontSize?: number }>;
export type SetLineLength = Action<
  'setLineLength',
  { lineLength: T.LineLength }
>;
export type SetMarkdownEnabled = Action<
  'setMarkdownEnabled',
  { markdownEnabled: boolean }
>;
export type SetNoteDisplay = Action<
  'setNoteDisplay',
  { noteDisplay: T.ListDisplayMode }
>;
export type SetSortReversed = Action<
  'setSortReversed',
  { sortReversed: boolean }
>;
export type SetSortTagsAlpha = Action<
  'setSortTagsAlpha',
  { sortTagsAlpha: boolean }
>;
export type SetSortType = Action<'setSortType', { sortType: T.SortType }>;
export type SetSpellCheck = Action<
  'setSpellCheck',
  { spellCheckEnabled: boolean }
>;
export type SetTheme = Action<'setTheme', { theme: T.Theme }>;
export type SetWPToken = Action<'setWPToken', { token: string }>;

/*
 * Normal action types
 */
export type CreateNote = Action<'CREATE_NOTE'>;
export type CloseNote = Action<'CLOSE_NOTE'>;
export type FilterNotes = Action<'FILTER_NOTES', { notes: T.NoteEntity[] }>;
export type Search = Action<'SEARCH', { searchQuery: string }>;
export type SetAuth = Action<'AUTH_SET', { status: AuthState }>;
export type SetUnsyncedNoteIds = Action<
  'SET_UNSYNCED_NOTE_IDS',
  { noteIds: T.EntityId[] }
>;
export type ToggleNoteInfo = Action<'NOTE_INFO_TOGGLE'>;
export type ToggleSimperiumConnectionStatus = Action<
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE',
  { simperiumConnected: boolean }
>;
export type ToggleEditMode = Action<'TOGGLE_EDIT_MODE'>;
export type ToggleRevisions = Action<'REVISIONS_TOGGLE'>;
export type ToggleTagDrawer = Action<'TAG_DRAWER_TOGGLE', { show: boolean }>;
export type ToggleTagEditing = Action<'TAG_EDITING_TOGGLE'>;
export type SelectNote = Action<'SELECT_NOTE', { note: T.NoteEntity }>;

export type ActionType =
  | CreateNote
  | CloseNote
  | LegacyAction
  | FilterNotes
  | Search
  | SelectNote
  | SetAccountName
  | SetAuth
  | SetAutoHideMenuBar
  | SetFocusMode
  | SetFontSize
  | SetLineLength
  | SetMarkdownEnabled
  | SetNoteDisplay
  | SetSortReversed
  | SetSortTagsAlpha
  | SetSortType
  | SetSpellCheck
  | SetTheme
  | SetUnsyncedNoteIds
  | SetWPToken
  | ToggleEditMode
  | ToggleNoteInfo
  | ToggleRevisions
  | ToggleSimperiumConnectionStatus
  | ToggleTagDrawer
  | ToggleTagEditing;

export type ActionCreator<A extends ActionType> = (...args: any[]) => A;
export type Reducer<S> = (state: S | undefined, action: ActionType) => S;

type LegacyAction =
  | Action<
      'App.deleteNoteForever',
      {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
        previousIndex: number;
      }
    >
  | Action<
      'App.loadAndSelectNote',
      {
        noteBucket: T.Bucket<T.Note>;
        noteId: T.EntityId;
        hasRemoteUpdate: boolean;
      }
    >
  | Action<
      'App.markdownNote',
      { noteBucket: T.Bucket<T.Note>; note: T.NoteEntity; markdown: boolean }
    >
  | Action<
      'App.noteRevisions',
      { noteBucket: T.Bucket<T.Note>; note: T.NoteEntity }
    >
  | Action<
      'App.noteUpdatedRemotely',
      {
        noteBucket: T.Bucket<T.Note>;
        noteId: T.EntityId;
        data: object;
        remoteUpdateInfo: object;
      }
    >
  | Action<
      'App.pinNote',
      { noteBucket: T.Bucket<T.Note>; note: T.NoteEntity; pin: boolean }
    >
  | Action<
      'App.publishNote',
      { noteBucket: T.Bucket<T.Note>; note: T.NoteEntity; publish: boolean }
    >
  | Action<
      'App.restoreNote',
      {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
        previousIndex: number;
      }
    >
  | Action<
      'App.trashNote',
      {
        noteBucket: T.Bucket<T.Note>;
        note: T.NoteEntity;
        previousIndex: number;
      }
    >
  | Action<'App.authChanged'>
  | Action<'App.closeDialog', { key: unknown }>
  | Action<'App.emptyTrash', { noteBucket: T.Bucket<T.Note> }>
  | Action<'App.loadNotes', { noteBucket: T.Bucket<T.Note> }>
  | Action<'App.newNote', { noteBucket: T.Bucket<T.Note>; content: string }>
  | Action<'App.noteRevisionsLoaded', { reivisions: T.NoteEntity[] }>
  | Action<'App.notesLoaded', { notes: T.NoteEntity[] }>
  | Action<'App.onNoteBeforeRemoteUpdate', { noteId: T.EntityId }>
  | Action<'App.selectNote', { note: T.NoteEntity; hasRemoteUpdate: boolean }>
  | Action<'App.selectTag', { tag: T.TagEntity }>
  | Action<'App.selectTagAndSElectFirstNote'>
  | Action<'App.selectTrash'>
  | Action<'App.setRevision', { revision: T.NoteEntity }>
  | Action<'App.setSearchFocus', { searchFocus: boolean }>
  | Action<'App.setShouldPrintNote', { shouldPrint: boolean }>
  | Action<'App.setUnsyncedNoteIds', { noteIds: T.EntityId[] }>
  | Action<'App.showAllNotes'>
  | Action<'App.showAllNotesAndSelectFirst'>
  | Action<'App.showDialog', { dialog: object }>
  | Action<'App.tagsLoaded', { tags: T.TagEntity[]; sortTagsAlpha: boolean }>
  | Action<'App.toggleNavigation'>;
