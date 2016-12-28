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

export const SearchBar = ( {
	onNewNote,
	onSearch,
	onSearchFocused,
	onToggleNavigation,
	showTrash,
} ) =>
	<div className="search-bar theme-color-border">
		<button className="button button-borderless" onClick={ onToggleNavigation } title="Tags">
			<TagsIcon />
		</button>
		<SearchField onSearch={ onSearch } onSearchFocused={ onSearchFocused } />
		<button
			className="button button-borderless"
			disabled={ showTrash }
			onClick={ onNewNote }
			title="New Note"
		>
			<NewNoteIcon />
		</button>
	</div>;

const {
	newNote,
	search,
	setSearchFocus,
	toggleNavigation,
} = appState.actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ( { appState: state } ) => ( {
	showTrash: state.showTrash,
} );

const mapDispatchToProps = ( dispatch, { noteBucket } ) => ( {
	onNewNote: () => {
		dispatch( newNote( { noteBucket } ) );
		recordEvent( 'list_note_created' );
	},
	onSearch: filter => {
		dispatch( search( { filter } ) );
		recordEvent( 'list_notes_searched' );
	},
	onSearchFocused: () => dispatch( setSearchFocus( { searchFocus: false } ) ),
	onToggleNavigation: () => dispatch( toggleNavigation() ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( SearchBar );
