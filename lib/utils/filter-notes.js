/**
 * External dependencies
 */
import { escapeRegExp, get, includes, overEvery } from 'lodash';

const includesSearch = ( text, search ) => search.test( text || '' );

const matchesTrashView = isViewingTrash => note =>
	isViewingTrash === !! get( note, 'data.deleted', false );

const matchesTag = tag => note =>
	! tag || includes( get( note, 'data.tags', [] ), get( tag, 'data.name', '' ) );

const matchesSearch = query => note =>
	! query || includesSearch( get( note, 'data.content' ), query );

export default function filterNotes( state ) {
	const {
		filter,    // {string} search query from input
		notes,     // {[note]} list of all available notes
		showTrash, // {bool} whether we are looking at the trashed notes
		tag,       // {tag|null} whether we are looking at a specific tag
	} = state;

	return notes
		.filter( overEvery( [
			matchesTrashView( showTrash ),
			matchesTag( tag ),
			matchesSearch( new RegExp( escapeRegExp( filter ), 'gi' ) ),
		] ) );
}
