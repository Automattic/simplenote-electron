import * as T from '../types';
import { AuthState } from './auth/constants';

export type Action<
  T extends string,
  Args extends { [extraProps: string]: unknown }
> = { type: T } & Args;

export type AuthSet = Action<'AUTH_SET', { status: AuthState }>;
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

export type Reducer<S> = (state: S | undefined, action: ActionType) => S;
