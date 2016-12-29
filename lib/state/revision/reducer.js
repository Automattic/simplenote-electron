/**
 * External dependencies
 */
import { combineReducers } from 'redux';

/**
 * Internal dependencies
 */
import {
	REVISION_IS_VIEWING,
	REVISION_SELECT,
} from '../action-types';

export const isViewingRevisions = ( state = false, { type, isViewing } ) =>
	REVISION_IS_VIEWING === type ? isViewing : state;

export const selectedRevision = ( state = null, { type, revision } ) =>
	REVISION_SELECT === type ? revision : state;

export default combineReducers( {
	isViewingRevisions,
	selectedRevision,
} );
