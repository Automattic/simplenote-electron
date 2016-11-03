import SimpleDecorator from 'draft-js-simpledecorator';

import CssClassWrapper from './css-class-wrapper';

const matchIndices = ( text, matcher ) => {
	const chunks = [];
	let match;

	while ( ( match = matcher.exec( text ) ) !== null ) {
		chunks.push( [ match.index, matcher.lastIndex ] );
	}

	return chunks;
};

const dispatch = callback => ( [ start, end ] ) =>
	callback( start, end, { className: 'search-match' } );

export const findMatchingText = matcher => ( contentBlock, callback ) => {
	const text = contentBlock
		.getText()
		.toLocaleLowerCase();

	if ( ! matcher || ! text ) {
		return;
	}

	matchIndices( text, matcher ).forEach( dispatch( callback ) );
};

/**
 * Decorator to highlight text matching given search string
 *
 * @param {string} search text to search for
 * @returns {null|Object}
 */
export const matchingTextDecorator = search => {
	if ( ! search ) {
		return null;
	}

	const query = search.toLocaleLowerCase();
	const matcher = new RegExp( query, 'g' );

	return new SimpleDecorator( findMatchingText( matcher ), CssClassWrapper );
};

export default matchingTextDecorator;
