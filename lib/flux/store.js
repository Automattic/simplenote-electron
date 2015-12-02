import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import appState from './app-state';
import settings from './settings';

const createStoreWithMiddleware = applyMiddleware(
	thunk
)( createStore );

const reducers = combineReducers( {
	settings: settings.reducer.bind( settings ),
	appState: appState.reducer.bind( appState )
} );

export default createStoreWithMiddleware( reducers );
