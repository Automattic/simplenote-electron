/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import appState from './flux/app-state';
import { tracks } from './analytics';
import NewNoteIcon from './icons/new-note';
import SearchField from './search-field';
import TagsIcon from './icons/tags';
import { withoutTags } from './utils/filter-notes';
import { toggleTagDrawer } from './state/ui/actions';
import { isPaneVisible } from './state/ui/selectors';

const {
	newNote,
	search,
} = appState.actionCreators;
const { recordEvent } = tracks;

export const SearchBar = ( {
	onNewNote,
	onToggleNavigation,
	query,
	showTrash,
} ) => (
	<div className="search-bar theme-color-border">
		<button className="button button-borderless" onClick={ onToggleNavigation } title="Tags">
			<TagsIcon />
		</button>
		<SearchField />
		<button
			className="button button-borderless"
			disabled={ showTrash }
			onClick={ () => onNewNote( withoutTags( query ) ) }
			title="New Note"
		>
			<NewNoteIcon />
		</button>
	</div>
);

const mapStateToProps = state => ( {
	isTagDrawerVisible: isPaneVisible( state, 'tagDrawer' ),
	query: state.appState.filter,
	showTrash: state.appState.showTrash,
} );

const mapDispatchToProps = ( dispatch, { noteBucket, isTagDrawerVisible } ) => ( {
	onNewNote: content => {
		dispatch( search( { filter: '' } ) );
		dispatch( newNote( { noteBucket, content } ) );
		recordEvent( 'list_note_created' );
	},
	onToggleNavigation: () => dispatch( toggleTagDrawer( ! isTagDrawerVisible ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( SearchBar );
