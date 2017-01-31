/**
 * Matches the title and excerpt in a note's content
 *
 * Both the title and the excerpt are determined as
 * content starting with something that isn't
 * whitespace and leads up to a newline or line end
 *
 * @type {RegExp} matches a title and excerpt in note content
 */
const noteTitleAndPreviewRegExp = /(\S[^\n]*)\s*(\S[^\n]*)?/;

/**
 * Returns the title and excerpt for a given note
 *
 * @param {Object} note a note object
 *
 * Markdown title syntax characters (#) are stripped from
 * the start of the lines.
 *
 * @returns {Object} title and excerpt (if available)
 */
export const noteTitleAndPreview = note => {
	const content = note && note.data && note.data.content;
	const match = noteTitleAndPreviewRegExp.exec( content || '' );

	const unstrippedTitle = match && match[1] && match[1].slice( 0, 200 ) || 'New note...';
	const unstrippedPreview = match && match[2] || '';

	const title = unstrippedTitle.replace( /^[#]+/, '' );
	const preview = unstrippedPreview.replace( /^[#]+/, '' );

	return { title, preview };
};

export default noteTitleAndPreview;
