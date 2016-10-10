export const setFontSize = fontSize => ( {
	type: 'setFontSize', fontSize
} );

export const increaseFontSize = () => ( dispatch, getState ) => {
	const { settings: { fontSize } } = getState();

	dispatch( setFontSize( fontSize + 1 ) );
};

export const decreaseFontSize = () => ( dispatch, getState ) => {
	const { settings: { fontSize } } = getState();

	dispatch( setFontSize( fontSize - 1 ) );
};

export const resetFontSize = () => setFontSize( undefined );

export const activateTheme = theme => ( {
	type: 'setTheme', theme
} );

export const setNoteDisplay = noteDisplay => ( {
	type: 'setNoteDisplay', noteDisplay
} );

export const setSortOrder = sortReversed => ( {
	type: 'setSortReversed', sortReversed
} );

export const toggleSortOrder = () => ( dispatch, getState ) => {
	const { settings: { sortReversed } } = getState();

	dispatch( setSortOrder( ! sortReversed ) );
};

export const setSortType = sortType => ( {
	type: 'setSortType', sortType
} );

export const setMarkdown = markdownEnabled => ( {
	type: 'setMarkdownEnabled', markdownEnabled
} );

export const setAccountName = accountName => ( {
	type: 'setAccountName', accountName
} );
