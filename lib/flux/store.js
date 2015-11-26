import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import appState from './app-state';

const createStoreWithMiddleware = applyMiddleware(
	thunk
)( createStore );

const reducers = combineReducers( {
	appState: appState.reducer.bind( appState )
} );

export default createStoreWithMiddleware( reducers );
