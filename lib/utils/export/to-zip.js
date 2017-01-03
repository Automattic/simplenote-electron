import JSZip from 'jszip';
import sanitize from 'sanitize-filename';
import { identity, update } from 'lodash';

/**
 * Generates filename for note based on note content
 *
 * Please see code for algorithm. The goal is to
 * find the first usable and non-blank line of text
 * from the note to generate the title.
 *
 * @param {Object} note object
 * @returns {Object} augmented note object with new filename
 */
const addFilename = note => ( {
	...note,
	filename: note.content
		.split( '\n' ) // base filename off of a single line
		.map( line => line.trim() ) // and ignore leading/trailing spaces
		.map( sanitize ) // strip away any invalid characters for a filename (such as `/`)
		.filter( identity ) // remove blank lines
		.concat( 'untitled' ) // use this as a default if there are no non-blank lines
		.shift() // take the first remaining line
		.slice( 0, 40 ), // and truncate to the first 40 characters
} );

/**
 * Appends associated tags as a list at end of note content if available
 *
 * @example
 * // returns the following
 * """
 * a regular plumbus
 *
 * Tags:
 *  - #plumbus
 *  - #howisitmade
 * """
 * appendTags( { content: 'a regular plumbus', tags: [ 'plumbus', 'howisitmade' ] } )
 *
 * @example
 * // returns note content unchanged
 * appendTags( { content: 'the fleeb has the fleeb juice' } )
 *
 * @param {Object} note note object
 * @returns Object augmented note whose
 */
const appendTags = note => note.tags
	? { ...note, content: `${ note.content }\n\nTags:\n${ note.tags.map( tag => ` - #${ tag }` ).join( '\n' ) }` }
	: note;

/**
 * Maps over notes and replaces duplicate filenames with ones appended by an increasing number
 *
 * @example
 * // when given `Yummy Recipe` and `Yummy Recipe` as duplicates
 * // will return `Yummy Recipe` and `Yummy Recipe (1)`
 *
 * @param {Array} notes final list of note objects for export
 * @param {Object} nameCounts pairs of filename/how many previous occurances in loop
 * @param {Object} note note object
 * @returns {[Array, Object]} final note list and accumulating filename counts
 */
const toUniqueNames = ( [ notes, nameCounts ], note ) => {
	const newNameCounts = update( nameCounts, note.fileName, n => n || 0 === n ? n + 1 : 0 );
	const count = newNameCounts[ note.fileName ];
	const fileName = count > 0
		? `${ note.fileName } (${ count })`
		: note.fileName;

	return [ [ ...notes, { ...note, fileName } ], newNameCounts ];
};

export const noteExportToZip = notes => {
	const zip = new JSZip();

	notes
		.activeNotes
		.map( appendTags ) // add tags to end of content
		.map( addFilename ) // generate filename from content
		.reduce( toUniqueNames, [ [], {} ] ) // add `(n)` if there are duplicates
		.shift() // the list of notes is the first item in the pair returned from above
		.forEach(
			( { content, fileName } ) => zip.file( `${ fileName }.txt`, content )
		); // add the note as a file in the zip

	notes
		.trashedNotes
		.map( appendTags ) // add tags to end of content
		.map( addFilename ) // generate filename from content
		.reduce( toUniqueNames, [ [], {} ] ) // add `(n)` if there are duplicates
		.shift() // the list of notes is the first item in the pair returned from above
		.forEach(
			( { content, fileName } ) => zip.file( `trash-${ fileName }.txt`, content )
		); // add the note as a file in the zip

	return zip.generateAsync( { type: 'base64' } );
};

export default noteExportToZip;
