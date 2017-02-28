import { combineReducers } from 'redux';

import { COLLECTION_SELECT } from '../action-types';

export const selectedCollection = ( state = 'All Notes', { type, collectionName } ) =>
	COLLECTION_SELECT === type && collectionName !== state
		? collectionName
		: state;

export default combineReducers( {
	selectedCollection,
} );
