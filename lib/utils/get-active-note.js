/**
 * Internal dependencies
 */
import filterNotes from './filter-notes';

export default function getActiveNote( state ) {
	if ( state.note ) {
		return state.note;
	}
	const filteredNotes = filterNotes( state );
	const noteIndex = Math.max( state.previousIndex, 0 );
	return filteredNotes[ noteIndex ];
}
