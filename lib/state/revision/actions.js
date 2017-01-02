/**
 * Internal dependencies
 */
import { REVISION_SELECT } from '../action-types';

export const selectRevision = revision => ( {
	type: REVISION_SELECT,
	revision,
} );
