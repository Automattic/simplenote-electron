import React, { PropTypes } from 'react';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import appState from './flux/app-state'
import browserShell from './browser-shell'
import { ContextMenu, MenuItem, Separator } from './context-menu';
import * as Dialogs from './dialogs/index'
import NoteInfo from './note-info'
import NoteList from './note-list'
import NoteEditor	from './note-editor'
import SearchField from './search-field'
import NavigationBar from './navigation-bar'
import Auth from './auth'
import NewNoteIcon from './icons/new-note'
import TagsIcon from './icons/tags'
import NoteDisplayMixin from './note-display-mixin'
import analytics from './analytics'
import classNames	from 'classnames'
import {
	compact,
	concat,
	flowRight,
	noop,
	get,
	has,
	includes,
	isObject,
	map,
	overEvery,
	pick,
	values,
} from 'lodash';

import * as settingsActions from './state/settings/actions';

let ipc = getIpc();

function getIpc() {
	try {
		ipc = __non_webpack_require__( 'electron' ).ipcRenderer;
	} catch ( e ) {
		ipc = {
			on: noop,
			removeListener: noop,
			send: noop
		};
	}

	return ipc;
}

function mapStateToProps( state ) {
	return state;
}

function mapDispatchToProps( dispatch, { noteBucket } ) {
	var actionCreators = Object.assign( {},
		appState.actionCreators
	);

	const thenReloadNotes = action => a => {
		dispatch( action( a ) );
		dispatch( actionCreators.loadNotes( { noteBucket } ) );
	};

	return {
		actions: bindActionCreators( actionCreators, dispatch ),
		...bindActionCreators( pick( settingsActions, [
			'activateTheme',
			'decreaseFontSize',
			'increaseFontSize',
			'resetFontSize',
			'setNoteDisplay',
			'setMarkdown',
			'setAccountName'
		] ), dispatch ),
		setSortType: thenReloadNotes( settingsActions.setSortType ),
		toggleSortOrder: thenReloadNotes( settingsActions.toggleSortOrder )
	};
}

const isElectron = ( () => {
	// https://github.com/atom/electron/issues/2288
	const foundElectron = has( window, 'process.type' );

	return () => foundElectron;
} )();

const includesSearch = ( text, search ) =>
	( text || '' )
		.toLocaleLowerCase()
		.includes( ( search || '' ).toLocaleLowerCase() );

const matchesTrashView = isViewingTrash => note =>
	isViewingTrash === !! get( note, 'data.deleted', false );

const matchesTag = tag => note =>
	! tag || includes( get( note, 'data.tags', [] ), get( tag, 'data.name', '' ) );

const matchesSearch = query => note =>
	! query || includesSearch( get( note, 'data.content' ), query );

export const App = connect( mapStateToProps, mapDispatchToProps )( React.createClass( {

	mixins: [NoteDisplayMixin],

	propTypes: {
		actions: PropTypes.object.isRequired,
		appState: PropTypes.object.isRequired,
		settings: PropTypes.object.isRequired,

		client: PropTypes.object.isRequired,
		noteBucket: PropTypes.object.isRequired,
		tagBucket: PropTypes.object.isRequired,
		onAuthenticate: PropTypes.func.isRequired,
		onSignOut: PropTypes.func.isRequired,
	},

	getDefaultProps: function() {
		return {
			onAuthenticate: () => {},
			onSignOut: () => {}
		};
	},

	componentWillMount: function() {
		if ( isElectron() ) {
			this.initializeElectron();
		}

		this.onAuthChanged();
	},

	componentDidMount: function() {
		ipc.on( 'appCommand', this.onAppCommand );
		ipc.send( 'settingsUpdate', this.props.settings );

		this.props.noteBucket
			.on( 'index', this.onNotesIndex )
			.on( 'update', this.onNoteUpdate )
			.on( 'remove', this.onNoteRemoved );

		this.props.tagBucket
			.on( 'index', this.onTagsIndex )
			.on( 'update', this.onTagsIndex )
			.on( 'remove', this.onTagsIndex );

		this.props.client
			.on( 'authorized', this.onAuthChanged )
			.on( 'unauthorized', this.onAuthChanged );

		this.onNotesIndex();
		this.onTagsIndex();

		analytics.tracks.recordEvent( 'application_opened' );
	},

	componentWillUnmount: function() {
		ipc.removeListener( 'appCommand', this.onAppCommand );
	},

	componentDidUpdate( prevProps ) {
		if ( this.props.settings !== prevProps.settings ) {
			ipc.send( 'settingsUpdate', this.props.settings );
		}
	},

	onAppCommand: function( event, command ) {
		const canRun = overEvery(
			isObject,
			o => o.action !== null,
			o => has( this.props.actions, o.action ) || has( this.props, o.action )
		);

		if ( canRun( command ) ) {
			// newNote expects a bucket to be passed in, but the action method itself wouldn't do that
			if ( command.action === 'newNote' ) {
				this.onNewNote();
			} else if ( has( this.props, command.action ) ) {
				const { action, ...args } = command;

				this.props[ action ]( ...values( args ) );
			} else {
				this.props.actions[ command.action ]( command );
			}
		}
	},

	onAuthChanged: function() {
		let isAuthorized = this.props.client.isAuthorized();
		this.props.actions.authChanged( {
			authorized: isAuthorized
		} );

		if ( isAuthorized ) {
			analytics.initialize( this.props.appState.accountName );
		}
	},

	onSelectNote: function( noteId ) {
		this.props.actions.loadAndSelectNote( {
			noteBucket: this.props.noteBucket,
			noteId
		} );
		analytics.tracks.recordEvent( 'list_note_opened' );
	},

	onPinNote: function( note, pin = true ) {
		this.props.actions.pinNote( {
			noteBucket: this.props.noteBucket,
			note, pin
		} );
	},

	onNotePrinted: function() {
		this.props.actions.setShouldPrintNote( {
			shouldPrint: false
		} );
	},

	onSearchFocused: function() {
		this.props.actions.setSearchFocus( {
			searchFocus: false
		} );
	},

	onMarkdownNote: function( note, markdown = true ) {
		this.props.actions.markdownNote( {
			noteBucket: this.props.noteBucket,
			note, markdown
		} );

		// Update global setting to set markdown flag for new notes
		this.props.setMarkdown( markdown );
	},

	onNotesIndex: function() {
		this.props.actions.loadNotes( {
			noteBucket: this.props.noteBucket
		} );
	},

	onNoteRemoved: function() {
		this.onNotesIndex();
	},

	onNewNote: function() {
		this.props.actions.newNote( {
			noteBucket: this.props.noteBucket
		} );
		analytics.tracks.recordEvent( 'list_note_created' );
	},

	onNoteUpdate: function( noteId, data, original, patch, isIndexing ) {
		this.props.actions.noteUpdated( {
			noteBucket: this.props.noteBucket,
			noteId, data, original, patch, isIndexing
		} );
	},

	onTagsIndex: function() {
		this.props.actions.loadTags( {
			tagBucket: this.props.tagBucket
		} );
	},

	onSelectTag: function( tag ) {
		this.props.actions.selectTag( { tag } );
		analytics.tracks.recordEvent( 'list_tag_viewed' );
	},

	onSettings: function() {
		this.props.actions.showDialog( {
			dialog: {
				type: 'Settings',
				modal: true,
				single: true
			}
		} );
	},

	onAbout: function() {
		this.props.actions.showDialog( {
			dialog: {
				type: 'About',
				modal: true,
				single: true
			}
		} );
	},

	onRenameTag: function( tag, name ) {
		this.props.actions.renameTag( {
			tagBucket: this.props.tagBucket,
			noteBucket: this.props.noteBucket,
			tag, name
		} );
	},

	onTrashTag: function( tag ) {
		this.props.actions.trashTag( {
			tagBucket: this.props.tagBucket,
			noteBucket: this.props.noteBucket,
			tag
		} );
		analytics.tracks.recordEvent( 'list_trash_viewed' );
	},

	onReorderTags: function( tags ) {
		this.props.actions.reorderTags( {
			tagBucket: this.props.tagBucket,
			tags
		} );
	},

	onSearch: function( filter ) {
		this.props.actions.search( { filter } );
		analytics.tracks.recordEvent( 'list_notes_searched' );
	},

	initializeElectron() {
		const remote = __non_webpack_require__( 'electron' ).remote;

		this.setState( {
			electron: {
				currentWindow: remote.getCurrentWindow(),
				Menu: remote.Menu
			}
		} );
	},

	filterNotes() {
		const {
			filter,    // {string} search query from input
			notes,     // {[note]} list of all available notes
			showTrash, // {bool} whether we are looking at the trashed notes
			tag,       // {tag|null} whether we are looking at a specific tag
		} = this.props.appState;

		return notes
			.filter( overEvery( [
				matchesTrashView( showTrash ),
				matchesTag( tag ),
				matchesSearch( filter ),
			] ) );
	},

	onSetEditorMode: function( mode ) {
		this.props.actions.setEditorMode( { mode } );
	},

	onUpdateContent: function( note, content ) {
		this.props.actions.updateNoteContent( {
			noteBucket: this.props.noteBucket,
			note, content
		} );
	},

	onUpdateNoteTags: function( note, tags ) {
		this.props.actions.updateNoteTags( {
			noteBucket: this.props.noteBucket,
			tagBucket: this.props.tagBucket,
			note, tags
		} );
	},

	onTrashNote: function( note ) {
		const previousIndex = this.getPreviousNoteIndex( note );
		this.props.actions.trashNote( {
			noteBucket: this.props.noteBucket,
			note,
			previousIndex
		} );
		analytics.tracks.recordEvent( 'editor_note_deleted' );
	},

	// gets the index of the note located before the currently selected one
	getPreviousNoteIndex: function( note ) {
		const filteredNotes = this.filterNotes();

		const noteIndex = function( filteredNote ) {
			return note.id === filteredNote.id;
		};

		return Math.max( filteredNotes.findIndex( noteIndex ) - 1, 0 );
	},

	onRestoreNote: function( note ) {
		const previousIndex = this.getPreviousNoteIndex( note );
		this.props.actions.restoreNote( {
			noteBucket: this.props.noteBucket,
			note,
			previousIndex
		} );
		analytics.tracks.recordEvent( 'editor_note_restored' );
	},

	onShareNote: function( note ) {
		this.props.actions.showDialog( {
			dialog: {
				type: 'Share',
				modal: true
			},
			params: { note }
		} );
	},

	onDeleteNoteForever: function( note ) {
		const previousIndex = this.getPreviousNoteIndex( note );
		this.props.actions.deleteNoteForever( {
			noteBucket: this.props.noteBucket,
			note,
			previousIndex
		} );
	},

	onRevisions: function( note ) {
		this.props.actions.noteRevisions( {
			noteBucket: this.props.noteBucket,
			note
		} );
		analytics.tracks.recordEvent( 'editor_versions_accessed' );
	},

	onEmptyTrash: function() {
		this.props.actions.emptyTrash( {
			noteBucket: this.props.noteBucket
		} );
	},

	onToolbarOutsideClick: function( isNavigationBar ) {
		const {
			actions: { toggleNavigation, toggleNoteInfo },
			appState: { dialogs, showNavigation, showNoteInfo }
		} = this.props;

		if ( dialogs.length > 0 ) {
			return;
		}

		if ( isNavigationBar && showNavigation ) {
			return toggleNavigation();
		}

		if ( ! isNavigationBar && showNoteInfo ) {
			return toggleNoteInfo();
		}
	},

	render: function() {
		const state = this.props.appState;
		const electron = get( this.state, 'electron' );
		const { settings, isSmallScreen } = this.props;
		const filteredNotes = this.filterNotes();

		const noteIndex = Math.max( state.previousIndex, 0 );
		const selectedNote = isSmallScreen || state.note ? state.note : filteredNotes[ noteIndex ];
		const selectedNoteId = get( selectedNote, 'id', state.selectedNoteId );

		const appClasses = classNames( 'app', `theme-${settings.theme}`, {
			'touch-enabled': ( 'ontouchstart' in document.body ),
		} );

		const mainClasses = classNames( 'simplenote-app', {
			'note-open': selectedNote,
			'note-info-open': state.showNoteInfo,
			'navigation-open': state.showNavigation,
			'is-electron': isElectron()
		} );

		return (
			<div className={appClasses}>
				{ isElectron() &&
					<ContextMenu Menu={ electron.Menu } window={ electron.currentWindow }>
						<MenuItem label="Undo" role="undo" />
						<MenuItem label="Redo" role="redo" />
						<Separator />
						<MenuItem label="Cut" role="cut" />
						<MenuItem label="Copy" role="copy" />
						<MenuItem label="Paste" role="paste" />
						<MenuItem label="Select All" role="selectall" />
					</ContextMenu>
				}
				{ state.authorized ?
						<div className={mainClasses}>
							<NavigationBar
								onSelectAllNotes={() => this.props.actions.selectAllNotes() }
								onSelectTrash={() => this.props.actions.selectTrash() }
								onSelectTag={this.onSelectTag}
								onSettings={this.onSettings}
								onAbout={this.onAbout}
								onEditTags={() => this.props.actions.editTags() }
								onRenameTag={this.onRenameTag}
								onTrashTag={this.onTrashTag}
								onReorderTags={this.onReorderTags}
								editingTags={state.editingTags}
								showTrash={state.showTrash}
								selectedTag={state.tag}
								tags={state.tags}
								onOutsideClick={this.onToolbarOutsideClick} />
							<div className="source-list theme-color-bg theme-color-fg">
								<div className="search-bar theme-color-border">
									<button title="Tags" className="button button-borderless" onClick={() => this.props.actions.toggleNavigation() }>
										<TagsIcon />
									</button>
									<SearchField
										onSearch={this.onSearch}
										placeholder={state.listTitle}
										searchFocus={state.searchFocus}
										onSearchFocused={this.onSearchFocused} />
									<button title="New Note" className="button button-borderless" disabled={state.showTrash} onClick={this.onNewNote}>
										<NewNoteIcon />
									</button>
								</div>
								<NoteList
									notes={filteredNotes}
									selectedNoteId={selectedNoteId}
									noteDisplay={settings.noteDisplay}
									onSelectNote={this.onSelectNote}
									onPinNote={this.onPinNote}
									onEmptyTrash={state.showTrash && this.onEmptyTrash} />
							</div>
							<NoteEditor
								editorMode={state.editorMode}
								note={selectedNote}
								revisions={state.revisions}
								onSetEditorMode={this.onSetEditorMode}
								onUpdateContent={this.onUpdateContent}
								onUpdateNoteTags={this.onUpdateNoteTags}
								onTrashNote={this.onTrashNote}
								onRestoreNote={this.onRestoreNote}
								onShareNote={this.onShareNote}
								onDeleteNoteForever={this.onDeleteNoteForever}
								onRevisions={this.onRevisions}
								onCloseNote={() => this.props.actions.closeNote()}
								onNoteInfo={() => this.props.actions.toggleNoteInfo()}
								shouldPrint={state.shouldPrint}
								onNotePrinted={this.onNotePrinted} />
							<NoteInfo
								note={selectedNote}
								onPinNote={this.onPinNote}
								onMarkdownNote={this.onMarkdownNote}
								onOutsideClick={this.onToolbarOutsideClick} />
						</div>
				:
					<Auth
						authPending={state.authPending}
						isAuthenticated={state.authorized}
						onAuthenticate={this.props.onAuthenticate}
					/>
				}
				{ ( this.props.appState.dialogs.length > 0 ) &&
					<div className="dialogs">
						{ this.renderDialogs() }
					</div> }
			</div>
		)
	},

	renderDialogs() {
		var { dialogs } = this.props.appState;

		const makeDialog = ( dialog, key ) => ( [
			dialog.modal && <div key="overlay" className="dialogs-overlay" onClick={ null } />,
			this.renderDialog( dialog, key )
		] );

		return flowRight( compact, concat, map )( dialogs, makeDialog );
	},

	renderDialog( { params, ...dialog }, key ) {
		var DialogComponent = Dialogs[ dialog.type ];

		if ( DialogComponent == null ) {
			throw new Error( 'Unknown dialog type.' );
		}

		return (
			<DialogComponent {...this.props} { ...{ key, dialog, params } } />
		);
	}
} ) );

export default browserShell( App );
