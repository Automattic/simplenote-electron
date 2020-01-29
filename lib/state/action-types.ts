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
export type FilterNotes = Action<'FILTER_NOTES', { notes: T.NoteEntity[] }>;
export type SetAuth = Action<'AUTH_SET', { status: AuthState }>;
export type ToggleSimperiumConnectionStatus = Action<
  'SIMPERIUM_CONNECTION_STATUS_TOGGLE',
  { simperiumConnected: boolean }
>;
export type ToggleTagDrawer = Action<'TAG_DRAWER_TOGGLE', { show: boolean }>;

export type ActionType =
  | FilterNotes
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
  | SetWPToken
  | ToggleSimperiumConnectionStatus
  | ToggleTagDrawer;

export type ActionCreator<A extends ActionType> = (...args: any[]) => A;
export type Reducer<S> = (state: S | undefined, action: ActionType) => S;
