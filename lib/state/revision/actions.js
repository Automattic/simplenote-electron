/**
 * Internal dependencies
 */
import {
	REVISION_IS_VIEWING,
	REVISION_SELECT,
} from '../action-types';

export const setIsViewingRevisions = isViewing => ( {
	type: REVISION_IS_VIEWING,
	isViewing,
} );

export const selectRevision = revision => ( {
	type: REVISION_SELECT,
	revision,
} );
