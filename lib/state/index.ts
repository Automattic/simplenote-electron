/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import {
  Dispatch as ReduxDispatch,
  Middleware as ReduxMiddleware,
  MiddlewareAPI,
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

import { middleware as searchMiddleware } from '../search';
import searchFieldMiddleware from './ui/search-field-middleware';
import simperiumMiddleware from './simperium/middleware';

import auth from './auth/reducer';
import notes from './notes/reducer';
import settings from './settings/reducer';
import tags from './tags/reducer';
import ui from './ui/reducer';

import * as A from './action-types';
import * as T from '../types';

export type AppState = {
  preferences?: T.Preferences;
  revision: T.NoteEntity | null;
  showNavigation: boolean;
  tag?: T.TagEntity;
  unsyncedNoteIds: T.EntityId[];
};

export const reducers = combineReducers<State, A.ActionType>({
  appState: appState.reducer.bind(appState),
  auth,
  notes,
  settings,
  tags,
  ui,
});

export type State = {
  appState: AppState;
  auth: ReturnType<typeof auth>;
  notes: ReturnType<typeof notes>;
  settings: ReturnType<typeof settings>;
  tags: ReturnType<typeof tags>;
  ui: ReturnType<typeof ui>;
};

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const store = createStore<State, A.ActionType, {}, {}>(
  reducers,
  composeEnhancers(
    persistState('settings', {
      key: 'simpleNote',
      slicer: path => state => ({
        // Omit property from persisting
        [path]: omit(state[path], 'focusModeEnabled'),
      }),
    }),
    applyMiddleware(
      thunk,
      searchMiddleware,
      searchFieldMiddleware,
      simperiumMiddleware
    )
  )
);

export type Store = {
  dispatch: Dispatch;
  getState(): State;
};

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

export type Dispatch = ReduxDispatch<A.ActionType>;
export type Middleware<Extension = {}> = ReduxMiddleware<
  Extension,
  State,
  Dispatch
>;

export default store;
