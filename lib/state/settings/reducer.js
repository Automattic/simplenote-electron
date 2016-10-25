import { combineReducers } from 'redux';
import { clamp } from 'lodash';

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

export default combineReducers( {
	accountName,
	fontSize,
	markdownEnabled,
	noteDisplay,
	sortType,
	sortReversed,
	theme
} );
