export const isPaneVisible = ( state, pane ) =>
	-1 !== state.ui.visiblePanes.indexOf( pane );

export const isEditorVisible = state => isPaneVisible( state, 'editor' );

export const isNoteListVisible = state => isNoteListVisible( state, 'noteList' );

export const isTagDrawerVisible = state => isPaneVisible( state, 'tagDrawer' );

export const isDistractionFreeMode = state => [ 'editor' ] === state.ui.visiblePanes;
