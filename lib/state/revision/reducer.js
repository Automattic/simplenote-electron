/**
 * External dependencies
 */
import { combineReducers } from 'redux';

/**
 * Internal dependencies
 */
import { REVISION_SELECT } from '../action-types';

export const selectedRevision = ( state = null, { type, revision } ) =>
	REVISION_SELECT === type ? revision : state;

export default combineReducers( {
	selectedRevision,
} );
