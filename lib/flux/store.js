import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import appState from './app-state';
import settings from './settings-reducer';

const createStoreWithMiddleware = applyMiddleware(
	thunk
)( createStore );

const reducers = combineReducers( {
	settings: settings,
	appState: appState.reducer.bind( appState )
} );

export default createStoreWithMiddleware( reducers );
