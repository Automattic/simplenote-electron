import {
	get,
	includes,
	matchesProperty,
	partition
} from 'lodash';

const untrashedAndVisibleTrash = showTrash =>
	matchesProperty( 'data.deleted', showTrash );

const matchingSelectedTag = tag => note =>
	! tag || includes( note.data.tags, tag.data.name );

const matchesSearch = regexp => note =>
	! regexp || regexp.test( get( note, 'data.content', '' ) );

const matchesAll = ( ...filters ) => o =>
	filters.reduce( ( t, c ) => t && c( o ), true );

export const filterNotes = ( { filter, notes, showTrash, tag, sortType, sortReversed } ) => {
	const regexp = filter && new RegExp( filter, 'gi' );

	const filtered = notes
		.filter( matchesAll(
			untrashedAndVisibleTrash( showTrash ),
			matchingSelectedTag( tag ),
			matchesSearch( regexp )
		) );

	const partitionedNotes = partition( filtered, note => note.pinned );

	const sorts = key => get( {
		alphabetical: ( a, b ) => a.data.content.localeCompare( b.data.content ),
		creationDate: ( a, b ) => b.data.creationDate - a.data.creationDate,
		modificationDate: ( a, b ) => b.data.modificationDate - a.data.modificationDate
	}, key, () => 0 );

	const reverser = sorter => sortReversed
		? ( a, b ) => -1 * sorter( a, b )
		: sorter;

	const [ pinned, notPinned ] = partitionedNotes
		.map( l => l.sort( reverser( sorts( sortType ) ) ) );

	return [ ...pinned, ...notPinned ];
};

export default filterNotes;
