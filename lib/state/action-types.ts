import * as T from '../types';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: any }
> = { type: T } & Args;

export type AuthSet = Action<'AUTH_SET', { status: Symbol }>;
export type FilterNotes = Action<'FILTER_NOTES', { notes: T.NoteEntity[] }>;
export type ToggleTagDrawer = Action<'TAG_DRAWER_TOGGLE', { show: boolean }>;
export type SetFontSize = Action<'setFontSize', { fontSize?: number }>;
export type SetWPToken = Action<'setWPToken', { token: string }>;

export type ActionType =
  | AuthSet
  | FilterNotes
  | ToggleTagDrawer
  | SetFontSize
  | SetWPToken;

export type Reducer<S> = (state: S, action: ActionType) => S;
