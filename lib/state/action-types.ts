import type { ChangeVersion, Ghost, RemoteInfo } from 'simperium';
import type * as T from '../types';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: unknown } = {}
> = { type: T } & Args & {
    meta?: {
      analytics?: [string, T.JSONSerializable | undefined][];
      nextNoteToOpen?: T.EntityId | null;
      searchResults?: {
        noteIds: T.EntityId[];
        tagHashes: T.TagHash[];
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
export type SetSortType = Action<
  'setSortType',
  { sortType: T.SortType; sortReversed?: boolean }
>;
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
export type CloseRevision = Action<'CLOSE_REVISION'>;
export type CloseWindow = Action<'CLOSE_WINDOW'>;
export type CreateNote = Action<'CREATE_NOTE', { note?: Partial<T.Note> }>;
export type CreateNoteWithId = Action<
  'CREATE_NOTE_WITH_ID',
  { noteId: T.EntityId; note?: Partial<T.Note> }
>;
export type DeleteOpenNoteForever = Action<'DELETE_OPEN_NOTE_FOREVER'>;
export type ExportNotes = Action<'EXPORT_NOTES'>;
export type FilterNotes = Action<
  'FILTER_NOTES',
  { noteIds: T.EntityId[]; tagHashes: T.TagHash[] }
>;
export type FocusSearchField = Action<'FOCUS_SEARCH_FIELD'>;
export type HideAlternateLoginPrompt = Action<'HIDE_ALTERNATE_LOGIN_PROMPT'>;
export type Logout = Action<'LOGOUT'>;
export type OpenNote = Action<'OPEN_NOTE', { noteId?: T.EntityId }>;
export type OpenRevision = Action<
  'OPEN_REVISION',
  { noteId: T.EntityId; version: number }
>;
export type OpenTag = Action<'OPEN_TAG', { tagName: T.TagName }>;
export type ReallyCloseWindow = Action<'REALLY_CLOSE_WINDOW'>;
export type ReallyLogout = Action<'REALLY_LOGOUT'>;
export type RecordEvent = Action<
  'RECORD_EVENT',
  { eventName: string; eventProperties?: T.JSONSerializable }
>;
export type RequestNotifications = Action<
  'REQUEST_NOTIFICATIONS',
  { sendNotifications: boolean }
>;
export type RestoreOpenNote = Action<'RESTORE_OPEN_NOTE'>;
export type Search = Action<'SEARCH', { searchQuery: string }>;
export type SelectNote = Action<'SELECT_NOTE', { noteId: T.EntityId }>;
export type SelectNoteAbove = Action<'SELECT_NOTE_ABOVE'>;
export type SelectNoteBelow = Action<'SELECT_NOTE_BELOW'>;
export type SelectTrash = Action<'SELECT_TRASH'>;
export type SetAnalytics = Action<'SET_ANALYTICS', { allowAnalytics: boolean }>;
export type SetUnsyncedNoteIds = Action<
  'SET_UNSYNCED_NOTE_IDS',
  { noteIds: T.EntityId[] }
>;
export type ShowAllNotes = Action<'SHOW_ALL_NOTES'>;
export type ShowAlternateLoginPrompt = Action<
  'SHOW_ALTERNATE_LOGIN_PROMPT',
  { email: string }
>;
export type ShowDialog = Action<
  'SHOW_DIALOG',
  {
    name: T.DialogType['type'];
    data?: object;
  }
>;
export type ShowUntaggedNotes = Action<'SHOW_UNTAGGED_NOTES'>;
export type StoreEditorSelection = Action<
  'STORE_EDITOR_SELECTION',
  { noteId: T.EntityId; start: number; end: number; direction: 'RTL' | 'LTR' }
>;
export type StoreNumberOfMatchesInNote = Action<
  'STORE_NUMBER_OF_MATCHES_IN_NOTE',
  { matches: number }
>;
export type StoreSearchSelection = Action<
  'STORE_SEARCH_SELECTION',
  { index: number | null }
>;
export type SystemThemeUpdate = Action<
  'SYSTEM_THEME_UPDATE',
  { prefers: 'light' | 'dark' }
>;
export type ToggleAnalytics = Action<'TOGGLE_ANALYTICS'>;
export type ToggleAutoHideMenuBar = Action<'TOGGLE_AUTO_HIDE_MENU_BAR'>;
export type ToggleEditMode = Action<'TOGGLE_EDIT_MODE'>;
export type ToggleFocusMode = Action<'TOGGLE_FOCUS_MODE'>;
export type ToggleKeyboardShortcuts = Action<'KEYBOARD_SHORTCUTS_TOGGLE'>;
export type ToggleNavigation = Action<'NAVIGATION_TOGGLE'>;
export type ToggleNoteList = Action<'NOTE_LIST_TOGGLE'>;
export type ToggleNoteActions = Action<'NOTE_ACTIONS_TOGGLE'>;
export type CloseNoteActions = Action<'NOTE_ACTIONS_CLOSE'>;
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
 * Data operations
 */
export type AddCollaborator = Action<
  'ADD_COLLABORATOR',
  { noteId: T.EntityId; collaboratorAccount: T.TagName }
>;
export type AddNoteTag = Action<
  'ADD_NOTE_TAG',
  { noteId: T.EntityId; tagName: T.TagName }
>;
export type DeleteNoteForever = Action<
  'DELETE_NOTE_FOREVER',
  { noteId: T.EntityId }
>;
export type EditNote = Action<
  'EDIT_NOTE',
  { noteId: T.EntityId; changes: Partial<T.Note> }
>;
export type EmptyTrash = Action<'EMPTY_TRASH'>;
export type ImportNote = Action<'IMPORT_NOTE', { note: T.Note }>;
export type ImportNoteWithId = Action<
  'IMPORT_NOTE_WITH_ID',
  { noteId: T.EntityId; note: T.Note }
>;
export type InsertTask = Action<'INSERT_TASK'>;
export type InsertTaskIntoNote = Action<
  'INSERT_TASK_INTO_NOTE',
  {
    noteId: T.EntityId;
    selection: [number, number, 'LTR' | 'RTL'];
  }
>;
export type MarkdownNote = Action<
  'MARKDOWN_NOTE',
  { noteId: T.EntityId; shouldEnableMarkdown: boolean }
>;
export type PinNote = Action<
  'PIN_NOTE',
  { noteId: T.EntityId; shouldPin: boolean }
>;
export type PublishNote = Action<
  'PUBLISH_NOTE',
  { noteId: T.EntityId; shouldPublish: boolean }
>;
export type RemoveCollaborator = Action<
  'REMOVE_COLLABORATOR',
  { noteId: T.EntityId; collaboratorAccount: T.TagName }
>;
export type RemoveNoteTag = Action<
  'REMOVE_NOTE_TAG',
  { noteId: T.EntityId; tagName: T.TagName }
>;
export type RenameTag = Action<
  'RENAME_TAG',
  { oldTagName: T.TagName; newTagName: T.TagName }
>;
export type ReorderTag = Action<
  'REORDER_TAG',
  { tagName: T.TagName; newIndex: number }
>;
export type RestoreNote = Action<'RESTORE_NOTE', { noteId: T.EntityId }>;
export type RestoreNoteRevision = Action<
  'RESTORE_NOTE_REVISION',
  { noteId: T.EntityId; version: number; note: T.Note }
>;
export type SetSystemTag = Action<
  'SET_SYSTEM_TAG',
  { note: T.NoteEntity; tagName: T.SystemTag; shouldHaveTag: boolean }
>;
export type TrashTag = Action<
  'TRASH_TAG',
  { tagName: T.TagName; remainingTags?: number }
>;

/*
 * Simperium operations
 */
export type AcknowledgePendingChange = Action<
  'ACKNOWLEDGE_PENDING_CHANGE',
  {
    entityId: T.EntityId;
    ccid: string;
  }
>;
export type ChangeConnectionStatus = Action<
  'CHANGE_CONNECTION_STATUS',
  { status: T.ConnectionState }
>;
export type GhostRemoveEntity = Action<
  'GHOST_REMOVE_ENTITY',
  { bucketName: string; entityId: T.EntityId }
>;
export type GhostSetChangeVersion = Action<
  'GHOST_SET_CHANGE_VERSION',
  {
    bucketName: string;
    version: ChangeVersion;
  }
>;
export type GhostSetEntity = Action<
  'GHOST_SET_ENTITY',
  {
    bucketName: string;
    entityId: T.EntityId;
    ghost: Ghost<unknown>;
  }
>;
export type LoadRevisions = Action<
  'LOAD_REVISIONS',
  { noteId: T.EntityId; revisions: [number, T.Note][] }
>;
export type NoteBucketRemove = Action<
  'NOTE_BUCKET_REMOVE',
  { noteId: T.EntityId }
>;
export type NoteBucketUpdate = Action<
  'NOTE_BUCKET_UPDATE',
  { noteId: T.EntityId; note: T.Note; isIndexing: boolean }
>;
export type PreferencesBucketRemove = Action<
  'PREFERENCES_BUCKET_REMOVE',
  { id: T.EntityId }
>;
export type PreferencesBucketUpdate = Action<
  'PREFERENCES_BUCKET_UPDATE',
  { id: T.EntityId; data: T.Preferences }
>;
export type RemoteAnalyticsUpdate = Action<
  'REMOTE_ANALYTICS_UPDATE',
  { allowAnalytics: boolean }
>;
export type RemoteNoteUpdate = Action<
  'REMOTE_NOTE_UPDATE',
  { noteId: T.EntityId; note: T.Note; remoteInfo?: RemoteInfo<T.Note> }
>;
export type RemoteNoteDeleteForever = Action<
  'REMOTE_NOTE_DELETE_FOREVER',
  { noteId: T.EntityId }
>;
export type RemoteTagDelete = Action<
  'REMOTE_TAG_DELETE',
  { tagHash: T.TagHash }
>;
export type RemoteTagUpdate = Action<
  'REMOTE_TAG_UPDATE',
  { tagHash: T.TagHash; tag: T.Tag; remoteInfo?: RemoteInfo<T.Tag> }
>;
export type SetChangeVersion = Action<
  'SET_CHANGE_VERSION',
  {
    bucketName: 'note' | 'tag' | 'preferences';
    cv: ChangeVersion;
  }
>;
export type SubmitPendingChange = Action<
  'SUBMIT_PENDING_CHANGE',
  {
    entityId: T.EntityId;
    ccid: string;
  }
>;
export type TagBucketRemove = Action<
  'TAG_BUCKET_REMOVE',
  { tagHash: T.TagHash }
>;
export type TagBucketUpdate = Action<
  'TAG_BUCKET_UPDATE',
  { tagHash: T.TagHash; tag: T.Tag; isIndexing: boolean }
>;
export type TagRefresh = Action<
  'TAG_REFRESH',
  { noteTags: Map<T.TagHash, Set<T.EntityId>> }
>;
export type UpdateAccountVerification = Action<
  'UPDATE_ACCOUNT_VERIFICATION',
  { state: T.VerificationState }
>;

export type ActionType =
  | AcknowledgePendingChange
  | AddCollaborator
  | AddNoteTag
  | ChangeConnectionStatus
  | CloseNote
  | CloseNoteActions
  | CloseDialog
  | CloseRevision
  | CloseWindow
  | CreateNote
  | CreateNoteWithId
  | DeleteOpenNoteForever
  | DeleteNoteForever
  | EditNote
  | EmptyTrash
  | ExportNotes
  | FilterNotes
  | FocusSearchField
  | GhostRemoveEntity
  | GhostSetChangeVersion
  | GhostSetEntity
  | HideAlternateLoginPrompt
  | ImportNote
  | ImportNoteWithId
  | InsertTask
  | InsertTaskIntoNote
  | LoadRevisions
  | Logout
  | MarkdownNote
  | NoteBucketRemove
  | NoteBucketUpdate
  | OpenNote
  | OpenRevision
  | OpenTag
  | PinNote
  | PreferencesBucketRemove
  | PreferencesBucketUpdate
  | PublishNote
  | ReallyCloseWindow
  | ReallyLogout
  | RecordEvent
  | RemoteAnalyticsUpdate
  | RemoteNoteUpdate
  | RemoteNoteDeleteForever
  | RemoteTagDelete
  | RemoteTagUpdate
  | RemoveCollaborator
  | RemoveNoteTag
  | RenameTag
  | ReorderTag
  | RequestNotifications
  | RestoreOpenNote
  | RestoreNote
  | RestoreNoteRevision
  | Search
  | SelectNote
  | SelectNoteAbove
  | SelectNoteBelow
  | SelectTrash
  | SetAccountName
  | SetAnalytics
  | SetAutoHideMenuBar
  | SetChangeVersion
  | SetFocusMode
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
  | ShowAlternateLoginPrompt
  | ShowDialog
  | ShowUntaggedNotes
  | StoreEditorSelection
  | StoreNumberOfMatchesInNote
  | StoreSearchSelection
  | SubmitPendingChange
  | SystemThemeUpdate
  | TagBucketRemove
  | TagBucketUpdate
  | TagRefresh
  | ToggleAnalytics
  | ToggleAutoHideMenuBar
  | ToggleEditMode
  | ToggleFocusMode
  | ToggleKeyboardShortcuts
  | ToggleNavigation
  | ToggleNoteList
  | ToggleNoteActions
  | ToggleNoteInfo
  | ToggleRevisions
  | ToggleSimperiumConnectionStatus
  | ToggleSortTagsAlpha
  | ToggleSortOrder
  | ToggleSpellcheck
  | ToggleTagDrawer
  | ToggleTagEditing
  | TrashNote
  | TrashTag
  | TrashOpenNote
  | UpdateAccountVerification
  | WindowResize;

export type ActionCreator<A extends ActionType> = (...args: any[]) => A;
export type Reducer<S> = (state: S | undefined, action: ActionType) => S;
