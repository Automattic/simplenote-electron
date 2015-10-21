import { createStore, combineReducers } from 'redux';
import appState from './app_state';

const reducers = combineReducers( { appState } );

export default createStore( reducers, {} );
