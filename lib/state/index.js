/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import { compose, createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import { omit } from 'lodash';

import appState from '../flux/app-state';

import auth from './auth/reducer';
import search from './search/reducer';
import { runSearches } from './search/middleware';
import settings from './settings/reducer';
import ui from './ui/reducer';

export const reducers = combineReducers({
  appState: appState.reducer.bind(appState),
  auth,
  search,
  settings,
  ui,
});

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
    applyMiddleware(runSearches, thunk)
  )
);

export default store;
