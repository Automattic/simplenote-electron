import { compose, createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import persistState from 'redux-localstorage';
import appState from './app-state';
import settings from './settings-reducer';

const reducers = combineReducers( {
	settings: settings,
	appState: appState.reducer.bind( appState )
} );

export default createStore( reducers, compose(
	persistState( 'settings', { key: 'simpleNote' } ),
	applyMiddleware( thunk )
) );
