/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import {
  Dispatch as ReduxDispatch,
  Middleware as ReduxMiddleware,
  compose,
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import persistState from 'redux-localstorage';
import { omit } from 'lodash';
import { isElectron } from '../utils/platform';

import * as persistence from './persistence';
import dataMiddleware from './data/middleware';
import electronMiddleware from './electron/middleware';
import { middleware as searchMiddleware } from '../search';
import uiMiddleware from './ui/middleware';
import searchFieldMiddleware from './ui/search-field-middleware';

import { reducer as browser, middleware as browserMiddleware } from './browser';
import data from './data/reducer';
import settings from './settings/reducer';
import simperium from './simperium/reducer';
import ui from './ui/reducer';

import * as A from './action-types';

const reducers = combineReducers<State, A.ActionType>({
  browser,
  data,
  settings,
  simperium,
  ui,
});

export type State = {
  browser: ReturnType<typeof browser>;
  data: ReturnType<typeof data>;
  settings: ReturnType<typeof settings>;
  simperium: ReturnType<typeof simperium>;
  ui: ReturnType<typeof ui>;
};

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const makeStore = (...middlewares: Middleware[]) =>
  persistence.loadState().then(([initialData, persistenceMiddleware]) =>
    createStore<State, A.ActionType, {}, {}>(
      reducers,
      initialData,
      composeEnhancers(
        persistState('settings', {
          key: 'simpleNote',
          slicer: (path) => (state) => ({
            // Omit property from persisting
            [path]: omit(state[path], ['accountName', 'focusModeEnabled']),
          }),
        }),
        applyMiddleware(
          dataMiddleware,
          browserMiddleware,
          searchMiddleware,
          searchFieldMiddleware,
          uiMiddleware,
          ...(isElectron ? [electronMiddleware] : []),
          ...middlewares,
          ...(persistenceMiddleware ? [persistenceMiddleware] : [])
        )
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

export type Selector<T> = (state: State, ...args: any[]) => T;
