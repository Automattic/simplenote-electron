import { combineReducers } from 'redux';

const revisionState = ( state = { revision: null, isViewingRevisions: false }, action ) => {
	if ( 'setRevisionState' !== action.type ) {
		return state;
	}
	console.log( action );
	return {
		...state,
		...action.revisionState,
	};
};

export default combineReducers( {
	revisionState,
} );
