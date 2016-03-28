import { combineReducers } from 'redux';
import appState from './app-state-reducer';
import settings from './settings-reducer';

export const reducers = combineReducers( {
	settings,
	appState
} );

export default reducers;
