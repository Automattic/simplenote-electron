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
import settings from './settings/reducer';
import tags from './tags/reducer';
import ui from './ui/reducer';

export const reducers = combineReducers( {
	appState: appState.reducer.bind( appState ),
	auth,
	settings,
	tags,
	ui,
} );

export const store = createStore( reducers, compose(
	persistState( 'settings', { key: 'simpleNote' } ),
	applyMiddleware( thunk )
) );

export default store;
