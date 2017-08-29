export const isPaneVisible = ( state, pane ) =>
	-1 !== state.ui.visiblePanes.indexOf( pane );
