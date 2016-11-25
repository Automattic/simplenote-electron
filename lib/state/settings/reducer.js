import { combineReducers } from 'redux';
import {
	clamp,
	get,
	difference,
	union,
} from 'lodash';

import {
	SHOW_PANE,
	HIDE_PANE,
} from '../action-types';

const sortType = ( state = 'modificationDate', action ) => {
	if ( 'setSortType' !== action.type ) {
		return state;
	}

	return action.sortType;
};

const sortReversed = ( state = false, action ) => {
	if ( 'setSortReversed' !== action.type ) {
		return state;
	}

	return action.sortReversed;
};

const theme = ( state = 'light', action ) => {
	if ( 'setTheme' !== action.type ) {
		return state;
	}

	return action.theme;
};

const fontSize = ( state = 16, { type, fontSize: size = 16 } ) => {
	if ( 'setFontSize' !== type ) {
		return state;
	}

	return clamp( size, 10, 30 )
};

const noteDisplay = ( state = 'comfy', action ) => {
	if ( 'setNoteDisplay' !== action.type ) {
		return state;
	}

	return action.noteDisplay;
};

const accountName = ( state = null, action ) => {
	if ( 'setAccountName' !== action.type ) {
		return state;
	}

	return action.accountName;
};

const markdownEnabled = ( state = false, action ) => {
	if ( 'setMarkdownEnabled' !== action.type ) {
		return state;
	}

	return action.markdownEnabled;
};

const visiblePanes = ( state = [
	'navigation-bar',
	'note-list',
	'note-editor',
], action ) => {
	if ( SHOW_PANE !== action.type && HIDE_PANE !== action.type ) {
		return state;
	}

	return get( {
		SHOW_PANE: ( { pane } ) => union( state, [ pane ] ),
		HIDE_PANE: ( { pane } ) => difference( state, [ pane ] ),
	}, action.type, () => state )( action );
};

export default combineReducers( {
	accountName,
	fontSize,
	markdownEnabled,
	noteDisplay,
	sortType,
	sortReversed,
	theme,
	visiblePanes,
} );
