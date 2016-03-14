import React from 'react';

const noteTitleAndPreviewRegExp = /(\S[^\n]*)\s*(\S[^\n]*)?/;

export const unbold = string => [ ...string ]
	.reduce( ( s, c ) => {
		const a = c[0];
		const b = [ ...c ][0];

		return ( a === b )
			? s + b
			: `${ s }<span style="font-weight: normal !important">${ b }</span>`;
	}, '' );

export const unboldComponent = string => {
	var html = [ ...string ].map( c => {
		const a = c[0];
		const b = [ ...c ][0];

		if ( a !== b ) {
			return React.createElement( 'span', {
				children: b,
				style: { fontWeight: 'normal !important' }
			} );
		}

		return b;
	} );

	return React.createElement( 'div', { children: html } );
};

export default {
	noteTitleAndPreview: function( note ) {
		var content = note && note.data && note.data.content;
		var match = noteTitleAndPreviewRegExp.exec( content || '' );

		// Unbold emoji - https://github.com/Automattic/simplenote-electron/issues/107
		var title = unboldComponent( match && match[1] && match[1].slice( 0, 200 ) || 'New note...' );

		var preview = match && match[2] || '';

		return { title, preview };
	}
};
