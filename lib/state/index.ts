/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import {
  Store as ReduxStore,
  compose,
  createStore,
  combineReducers,
  applyMiddleware,
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

export type AppState = {
  dialogs: unknown[];
  editingTags: boolean;
  filter: string;
  isViewingRevisions: boolean;
  listTitle: T.TranslatableString;
  nextDialogKey: number;
  notes: T.NoteEntity[] | null;
  preferences?: T.Preferences;
  previousIndex: number;
  revision: T.NoteEntity | null;
  searchFocus: boolean;
  showNavigation: boolean;
  showNoteInfo: boolean;
  showTrash: boolean;
  tags: T.TagEntity[];
  tag?: T.TagEntity;
  unsyncedNoteIds: T.EntityId[];
};

export const reducers = combineReducers({
  appState: appState.reducer.bind(appState),
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

export const store = createStore(
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

export type Store = ReduxStore<State, A.ActionType>;

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
      ) => A.ActionType;
    };

export default store;
