import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import appState from './app_state';

const createStoreWithMiddleware = applyMiddleware(
  thunk
)( createStore );

const reducers = combineReducers( { appState } );

export default createStoreWithMiddleware( reducers );
