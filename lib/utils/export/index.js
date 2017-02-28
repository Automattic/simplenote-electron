import {
	filter,
	flowRight as compose,
	get,
	partialRight,
	partition,
	property,
	reverse,
	sortBy,
	uniqueId,
} from 'lodash';

export const LF_ONLY_NEWLINES = /(?!\r)\n/g;

// needs three pieces
//  - a mailbox without an `@`
//  - an `@`
//  - domain with at least `host.tld`
const naiveEmailPattern = /[^@]+@[^.]+\.[^.]+/;

const mapNote = note => {
	const [ collaboratorEmails, tags ] = partition(
		sortBy(
			get( note, 'data.tags', [] ),
			a => a.toLocaleLowerCase()
		),
		tag => naiveEmailPattern.test( tag ),
	);

	return Object.assign(
		{
			id: get( note, 'id', uniqueId( 'unknown_note_' ) ),
			content: get( note, 'data.content', '' ).replace( LF_ONLY_NEWLINES, '\r\n' ),
			creationDate: ( new Date( note.data.creationDate * 1000 ) ).toISOString(),
			lastModified: ( new Date( note.data.modificationDate * 1000 ) ).toISOString(),
		},
		get( note, 'pinned', false ) && { pinned: true },
		tags.length && { tags },
		(
			get( note, 'data.systemTags', [] ).includes( 'published' ) &&
			get( note, 'data.publishURL', '' ).length
		) && { publicURL: `http://simp.ly/p/${ get( note, 'data.publishURL', '' ) }` },
		(
			get( note, 'data.systemTags', [] ).includes( 'shared' ) &&
			collaboratorEmails.length
		) && { collaboratorEmails },
	);
};

const nonEmptyByRecentEdits = compose(
	reverse,
	partialRight( sortBy, property( 'data.modificationDate' ) ),
	partialRight( filter, property( 'data.content' ) ),
);

const mapNotes = notes => {
	const [ trashedNotes, activeNotes ] = partition(
		nonEmptyByRecentEdits( notes ),
		note => !! get( note, 'data.deleted', false )
	).map( list => list.map( mapNote ) );

	return Promise.resolve( {
		activeNotes,
		trashedNotes,
	} );
};

const readNotes = db =>
	new Promise( ( resolve, reject ) => {
		const request = db
			.transaction( 'note' )
			.objectStore( 'note' )
			.openCursor();

		const notes = [];
		request.onsuccess = ( { target: { result: cursor } } ) =>
			cursor
				? notes.push( cursor.value ) && cursor.continue()
				: resolve( notes );

		request.onerror = reject;
	} );

const openDatabase = () =>
	new Promise( ( resolve, reject ) => {
		const idb = window
			.indexedDB
			.open( 'simplenote' );

		idb.onsuccess = ( { target: { result: db } } ) => resolve( db );
		idb.onerror = reject;
	} );

export const exportNotes = () =>
	openDatabase()
		.then( readNotes )
		.then( mapNotes );

export default exportNotes;
