import React, { PropTypes } from 'react';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import settingsMap from './flux/settings'
import appState from './flux/app-state'
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
import { noop, get } from 'lodash';

let ipc = getIpc();

function getIpc() {
	try {
		ipc = __non_webpack_require__( 'ipc' );
	} catch ( e ) {
		ipc = {
			on: noop,
			removeListener: noop
		};
	}

	return ipc;
}

function mapStateToProps( state ) {
	return state;
}

function mapDispatchToProps( dispatch ) {
	var actionCreators = Object.assign( {},
		settingsMap.actionCreators,
		appState.actionCreators
	);

	return { actions: bindActionCreators( actionCreators, dispatch ) };
}

export default connect( mapStateToProps, mapDispatchToProps )( React.createClass( {

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
		this.onAuthChanged();
	},

	componentDidMount: function() {
		ipc.on( 'appCommand', this.onAppCommand );

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

	onAppCommand: function( command ) {
		if ( command != null && typeof command === 'object' && command.action != null && this.props.actions.hasOwnProperty( command.action ) ) {
			this.props.actions[ command.action ]( command );
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

	onMarkdownNote: function( note, markdown = true ) {
		this.props.actions.markdownNote( {
			noteBucket: this.props.noteBucket,
			note, markdown
		} );
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

	filterNotes: function() {
		var { filter, showTrash, notes, tag } = this.props.appState;
		var regexp;

		if ( filter ) {
			regexp = new RegExp( filter, 'gi' );
		}

		function test( note ) {
			// if and only if trash is being viewed, return trashed notes
			if ( showTrash !== !!note.data.deleted ) {
				return false;
			}
			// if tag is selected only return those with the tag
			if ( tag && note.data.tags.indexOf( tag.data.name ) === -1 ) {
				return false;
			}
			if ( regexp && !regexp.test( note.data.content || '' ) ) {
				return false;
			}
			return true;
		}

		return notes.filter( test );
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
		function noteIndex( filteredNote, index, array ) {
  			return note.id === filteredNote.id;
  		}

  		return Math.max( this.filteredNotes.findIndex( noteIndex ) - 1, 0 );
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
		var state = this.props.appState;
		var { settings } = this.props;
		this.filteredNotes = this.filterNotes();
		
		const noteIndex = Math.max( state.previousIndex, 0 );
		const selectedNote = state.note ? state.note : this.filteredNotes[ noteIndex ];
		const selectedNoteId = get( selectedNote, 'id', state.selectedNoteId );

		var appClasses = classNames( 'app', `theme-${this.props.settings.theme}`, {
			'touch-enabled': ( 'ontouchstart' in document.body ),
		} );

		var mainClasses = classNames( 'simplenote-app', {
			'note-open': selectedNote,
			'note-info-open': state.showNoteInfo,
			'navigation-open': state.showNavigation
		} );

		return (
			<div className={appClasses}>
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
									<button className="button button-borderless" onClick={() => this.props.actions.toggleNavigation() }>
										<TagsIcon />
									</button>
									<SearchField onSearch={this.onSearch} placeholder={state.listTitle} />
									<button className="button button-borderless" disabled={state.showTrash} onClick={this.onNewNote}>
										<NewNoteIcon />
									</button>
								</div>
								<NoteList
									notes={this.filteredNotes}
									selectedNoteId={selectedNoteId}
									onSelectNote={this.onSelectNote}
									onPinNote={this.onPinNote}
									onEmptyTrash={state.showTrash && this.onEmptyTrash} />
							</div>
							<NoteEditor
								editorMode={state.editorMode}
								note={selectedNote}
								revisions={state.revisions}
								markdownEnabled={settings.markdownEnabled}
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
								fontSize={settings.fontSize} />
							<NoteInfo
								note={selectedNote}
								markdownEnabled={settings.markdownEnabled}
								onPinNote={this.onPinNote}
								onMarkdownNote={this.onMarkdownNote}
								onOutsideClick={this.onToolbarOutsideClick} />
						</div>
				:
					<Auth onAuthenticate={this.props.onAuthenticate} />
				}
				{this.renderDialogs()}
			</div>
		)
	},

	renderDialogs() {
		var { dialogs } = this.props.appState;
		var elements = [], modalIndex;

		if ( dialogs.length === 0 ) {
			return;
		}

		for ( let i = 0; i < dialogs.length; i++ ) {
			let dialog = dialogs[i];
			if ( dialog.modal ) {
				modalIndex = i;
			}

			elements.push( this.renderDialog( dialog ) );
		}

		if ( modalIndex != null ) {
			elements.splice( modalIndex, 0,
				<div key="overlay" className="dialogs-overlay" onClick={null}></div>
			);
		}

		return (
			<div className="dialogs">
				{elements}
			</div>
		);
	},

	renderDialog( { params, ...dialog } ) {
		var DialogComponent = Dialogs[ dialog.type ];

		if ( DialogComponent == null ) {
			throw new Error( 'Unknown dialog type.' );
		}

		return (
			<DialogComponent {...this.props} dialog={dialog} params={params} />
		);
	}
} ) );
