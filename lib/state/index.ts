import {
  Dispatch as ReduxDispatch,
  Middleware as ReduxMiddleware,
  compose,
  createStore,
  combineReducers,
  applyMiddleware,
} from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import { omit } from 'lodash';

import { middleware as searchMiddleware } from '../search';
import searchFieldMiddleware from './ui/search-field-middleware';

import auth from './auth/reducer';
import data from './data/reducer';
import settings from './settings/reducer';
import tags from './tags/reducer';
import ui from './ui/reducer';

import * as A from './action-types';

export const reducers = combineReducers<State, A.ActionType>({
  auth,
  data,
  settings,
  tags,
  ui,
});

export type State = {
  auth: ReturnType<typeof auth>;
  data: ReturnType<typeof data>;
  settings: ReturnType<typeof settings>;
  tags: ReturnType<typeof tags>;
  ui: ReturnType<typeof ui>;
};

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export const makeStore = (...middlewares: Middleware[]) =>
  createStore<State, A.ActionType, {}, {}>(
    reducers,
    composeEnhancers(
      persistState('settings', {
        key: 'simpleNote',
        slicer: (path) => (state) => ({
          // Omit property from persisting
          [path]: omit(state[path], 'focusModeEnabled'),
        }),
      }),
      applyMiddleware(
        thunk,
        searchMiddleware,
        searchFieldMiddleware,
        ...middlewares
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
