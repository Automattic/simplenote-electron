const noteTitleAndPreviewRegExp = /(\S[^\n]*)\s*(\S[^\n]*)?/;

export default {
	noteTitleAndPreview: function(note) {
		var content = note && note.data && note.data.content;
		var match = noteTitleAndPreviewRegExp.exec( content || '' );

		var title   = match && match[1] && match[1].slice( 0, 200 ) || 'New note...';
		var preview = match && match[2] || '';

		return { title, preview };
	}
};
