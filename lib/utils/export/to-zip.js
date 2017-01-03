import JSZip from 'jszip';
import sanitize from 'sanitize-filename';
import { identity, update } from 'lodash';

const addFilename = note => {
	const { content } = note;

	const fileName = content
		.split( '\n' ) // base filename off of a single line
		.map( line => line.trim() ) // and ignore leading/trailing spaces
		.map( sanitize ) // strip away any invalid characters for a filename (such as `/`)
		.filter( identity ) // remove blank lines
		.concat( 'untitled' ) // use this as a default if there are no non-blank lines
		.shift() // take the first remaining line
		.slice( 0, 40 ); // and truncate to the first 40 characters

	return { ...note, fileName };
};

const toUniqueNames = ( [ notes, nameCounts ], note ) => {
	const newNameCounts = update( nameCounts, note.fileName, n => n || 0 === n ? n + 1 : 0 );
	const count = newNameCounts[ note.fileName ];
	const fileName = count > 0
		? `${ note.fileName }-(${ count })`
		: note.fileName;

	return [ [ ...notes, { ...note, fileName } ], newNameCounts ];
};

export const noteExportToZip = notes => {
	const zip = new JSZip();

	notes
		.activeNotes
		.map( addFilename ) // generate filename from content
		.reduce( toUniqueNames, [ [], {} ] ) // add `(n)` if there are duplicates
		.shift() // the list of notes is the first item in the pair returned from above
		.forEach(
			( { content, fileName } ) => zip.file( `${ fileName }.txt`, content )
		); // add the note as a file in the zip

	notes
		.trashedNotes
		.map( addFilename ) // generate filename from content
		.reduce( toUniqueNames, [ [], {} ] ) // add `(n)` if there are duplicates
		.shift() // the list of notes is the first item in the pair returned from above
		.forEach(
			( { content, fileName } ) => zip.file( `trash-${ fileName }.txt`, content )
		); // add the note as a file in the zip

	return zip.generateAsync( { type: 'base64' } );
};

export default noteExportToZip;
