/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import {
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  Reducer,
} from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import { omit } from 'lodash';

import appState from '../flux/app-state';

import uiMiddleware from './ui/middleware';

import auth from './auth/reducer';
import settings from './settings/reducer';
import ui from './ui/reducer';

import * as A from './action-types';
import * as T from '../types';
import { ActionType } from './action-types';

export type AppState = {
  dialogs: unknown[];
  editorMode: T.EditorMode;
  editingTags: boolean;
  filter: string;
  isOffline: boolean;
  isViewingRevisions: boolean;
  listTitle: T.TranslatableString;
  nextDialogKey: number;
  note?: T.NoteEntity;
  notes: T.NoteEntity[] | null;
  preferences?: T.Preferences;
  previousIndex: number;
  revision: T.NoteEntity | null;
  searchFocus: boolean;
  selectedNoteId: T.EntityId | null;
  shouldPrint: boolean;
  showNavigation: boolean;
  showNoteInfo: boolean;
  showTrash: boolean;
  tags: T.TagEntity[];
  tag?: T.TagEntity;
  unsyncedNoteIds: T.EntityId[];
};

export const reducers: Reducer<State, A.ActionType> = combineReducers({
  appState: appState.reducer.bind(appState) as Reducer<AppState, A.ActionType>,
  auth,
  settings,
  ui,
});

export type State = {
  appState: AppState;
  auth: ReturnType<typeof auth>;
  settings: ReturnType<typeof settings>;
  ui: ReturnType<typeof ui>;
};

export const store = createStore<State, A.ActionType, {}, {}>(
  reducers,
  compose(
    persistState('settings', {
      key: 'simpleNote',
      slicer: path => state => ({
        // Omit property from persisting
        [path]: omit(state[path], 'focusModeEnabled'),
      }),
    }),
    applyMiddleware(thunk, uiMiddleware)
  )
);

export type MapState<StateProps, OwnProps = {}> = (
  state: State,
  ownProps: OwnProps
) => StateProps;

export type MapDispatchFunction<DispatchProps, OwnProps = {}> = (
  dispatch: <T extends A.ActionType>(action: T) => T,
  ownProps: OwnProps
) => DispatchProps;

export type MapDispatch<
  DispatchProps extends { [name: string]: (...args: any[]) => any },
  OwnProps = {}
> =
  | MapDispatchFunction<DispatchProps, OwnProps>
  | {
      [P in keyof DispatchProps]: (
        ...args: Parameters<DispatchProps[P]>
      ) => ActionType;
    };

export default store;
