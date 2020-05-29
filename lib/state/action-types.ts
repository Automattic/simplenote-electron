import * as T from '../types';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: unknown } = {}
> = { type: T } & Args & {
    meta?: {
      searchResults: {
        noteIds: T.EntityId[];
        tagIds: T.EntityId[];
      };
    };
  };

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

/*
 * Normal action types
 */
export type CloseDialog = Action<'CLOSE_DIALOG'>;
export type CloseNote = Action<'CLOSE_NOTE'>;
export type CreateNote = Action<'CREATE_NOTE', { note?: Partial<T.Note> }>;
export type CreateNoteWithId = Action<
  'CREATE_NOTE_WITH_ID',
  { noteId: T.EntityId; note?: Partial<T.Note> }
>;
export type DecreaseFontSize = Action<'DECREASE_FONT_SIZE'>;
export type DeleteOpenNoteForever = Action<'DELETE_OPEN_NOTE_FOREVER'>;
export type FilterNotes = Action<
  'FILTER_NOTES',
  { noteIds: T.EntityId[]; tagIds: T.EntityId[] }
>;
export type FocusSearchField = Action<'FOCUS_SEARCH_FIELD'>;
export type IncreaseFontSize = Action<'INCREASE_FONT_SIZE'>;
export type Logout = Action<'LOGOUT'>;
export type OpenNote = Action<'OPEN_NOTE', { noteId?: T.EntityId }>;
export type OpenTag = Action<'OPEN_TAG', { tagId: T.EntityId }>;
export type RemoteNoteUpdate = Action<
  'REMOTE_NOTE_UPDATE',
  { noteId: T.EntityId; data: T.Note }
>;
export type ResetFontSize = Action<'RESET_FONT_SIZE'>;
export type RestoreOpenNote = Action<'RESTORE_OPEN_NOTE'>;
export type Search = Action<'SEARCH', { searchQuery: string }>;
export type SelectNote = Action<'SELECT_NOTE', { noteId: T.EntityId }>;
export type SelectNoteAbove = Action<'SELECT_NOTE_ABOVE'>;
export type SelectNoteBelow = Action<'SELECT_NOTE_BELOW'>;
export type SelectRevision = Action<
  'SELECT_REVISION',
  { revision: T.NoteEntity }
>;
export type SelectTrash = Action<'SELECT_TRASH'>;
export type SetAnalytics = Action<'SET_ANALYTICS', { allowAnalytics: boolean }>;
export type SetUnsyncedNoteIds = Action<
  'SET_UNSYNCED_NOTE_IDS',
  { noteIds: T.EntityId[] }
>;
export type ShowAllNotes = Action<'SHOW_ALL_NOTES'>;
export type ShowDialog = Action<'SHOW_DIALOG', { dialog: T.DialogType }>;
export type StoreRevisions = Action<
  'STORE_REVISIONS',
  { noteId: T.EntityId; revisions: T.NoteEntity[] }
>;
export type SystemThemeUpdate = Action<
  'SYSTEM_THEME_UPDATE',
  { prefers: 'light' | 'dark' }
>;
export type TagsLoaded = Action<
  'TAGS_LOADED',
  { tags: T.TagEntity[]; sortTagsAlpha: boolean }
>;
export type ToggleAnalytics = Action<'TOGGLE_ANALYTICS'>;
export type ToggleAutoHideMenuBar = Action<'TOGGLE_AUTO_HIDE_MENU_BAR'>;
export type ToggleEditMode = Action<'TOGGLE_EDIT_MODE'>;
export type ToggleFocusMode = Action<'TOGGLE_FOCUS_MODE'>;
export type ToggleKeyboardShortcuts = Action<'KEYBOARD_SHORTCUTS_TOGGLE'>;
export type ToggleNavigation = Action<'NAVIGATION_TOGGLE'>;
export type ToggleNoteList = Action<'NOTE_LIST_TOGGLE'>;
export type ToggleNoteInfo = Action<'NOTE_INFO_TOGGLE'>;
export type ToggleRevisions = Action<'REVISIONS_TOGGLE'>;
export type ToggleSimperiumConnectionStatus = Action<
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE',
  { simperiumConnected: boolean }
>;
export type ToggleSortTagsAlpha = Action<'TOGGLE_SORT_TAGS_ALPHA'>;
export type ToggleSortOrder = Action<'TOGGLE_SORT_ORDER'>;
export type ToggleSpellcheck = Action<'TOGGLE_SPELLCHECK'>;
export type ToggleTagDrawer = Action<'TAG_DRAWER_TOGGLE', { show: boolean }>;
export type ToggleTagEditing = Action<'TAG_EDITING_TOGGLE'>;
export type TrashNote = Action<'TRASH_NOTE', { noteId: T.EntityId }>;
export type TrashOpenNote = Action<'TRASH_OPEN_NOTE'>;
export type WindowResize = Action<'WINDOW_RESIZE', { innerWidth: number }>;

/*
 * Note operations
 */
export type DeleteNoteForever = Action<
  'DELETE_NOTE_FOREVER',
  { noteId: T.EntityId }
>;
export type EditNote = Action<
  'EDIT_NOTE',
  { noteId: T.EntityId; changes: Partial<T.Note> }
>;
export type ImportNote = Action<'IMPORT_NOTE', { note: T.Note }>;
export type ImportNoteWithId = Action<
  'IMPORT_NOTE_WITH_ID',
  { noteId: T.EntityId; note: T.Note }
>;
export type MarkdownNote = Action<
  'MARKDOWN_NOTE',
  { noteId: T.EntityId; shouldEnableMarkdown: boolean }
>;
export type PinNote = Action<
  'PIN_NOTE',
  { noteId: T.EntityId; shouldPin: boolean }
>;
export type RestoreNote = Action<'RESTORE_NOTE', { noteId: T.EntityId }>;
export type SetSystemTag = Action<
  'SET_SYSTEM_TAG',
  { note: T.NoteEntity; tagName: T.SystemTag; shouldHaveTag: boolean }
>;

export type ActionType =
  | CloseNote
  | CloseDialog
  | CreateNote
  | CreateNoteWithId
  | DecreaseFontSize
  | DeleteOpenNoteForever
  | DeleteNoteForever
  | EditNote
  | FilterNotes
  | FocusSearchField
  | ImportNote
  | ImportNoteWithId
  | IncreaseFontSize
  | Logout
  | MarkdownNote
  | RemoteNoteUpdate
  | OpenNote
  | OpenTag
  | PinNote
  | ResetFontSize
  | RestoreOpenNote
  | RestoreNote
  | Search
  | SelectNote
  | SelectNoteAbove
  | SelectNoteBelow
  | SelectRevision
  | SelectTrash
  | SetAccountName
  | SetAnalytics
  | SetAutoHideMenuBar
  | SetFocusMode
  | SetFontSize
  | SetLineLength
  | SetNoteDisplay
  | SetSortReversed
  | SetSortTagsAlpha
  | SetSortType
  | SetSpellCheck
  | SetSystemTag
  | SetTheme
  | SetUnsyncedNoteIds
  | ShowAllNotes
  | ShowDialog
  | StoreRevisions
  | SystemThemeUpdate
  | TagsLoaded
  | ToggleAnalytics
  | ToggleAutoHideMenuBar
  | ToggleEditMode
  | ToggleFocusMode
  | ToggleKeyboardShortcuts
  | ToggleNavigation
  | ToggleNoteList
  | ToggleNoteInfo
  | ToggleRevisions
  | ToggleSimperiumConnectionStatus
  | ToggleSortTagsAlpha
  | ToggleSortOrder
  | ToggleSpellcheck
  | ToggleTagDrawer
  | ToggleTagEditing
  | TrashNote
  | TrashOpenNote
  | WindowResize;

export type ActionCreator<A extends ActionType> = (...args: any[]) => A;
export type Reducer<S> = (state: S | undefined, action: ActionType) => S;
