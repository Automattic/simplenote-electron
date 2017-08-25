/**
 * Top-level of app state tree
 *
 * All data should flow through here
 */

import { compose, createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';

import appState from '../flux/app-state';

import auth from './auth/reducer';
import revision from './revision/reducer';
import settings from './settings/reducer';

export const reducers = combineReducers( {
	appState: appState.reducer.bind( appState ),
	auth,
	revision,
	settings,
} );

export const store = createStore( reducers, compose(
	persistState( 'settings', { key: 'simpleNote' } ),
	applyMiddleware( thunk )
) );

export default store;
