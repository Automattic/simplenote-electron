import React from 'react';

const noteTitleAndPreviewRegExp = /(\S[^\n]*)\s*(\S[^\n]*)?/;

const unbold = string => {
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

		var title = unbold( match && match[1] && match[1].slice( 0, 200 ) || 'New note...' );

		// Unbold emoji - https://github.com/Automattic/simplenote-electron/issues/107

		var preview = unbold( match && match[2] || '' );

		return { title, preview };
	}
};
