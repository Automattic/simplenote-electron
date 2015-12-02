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
import NewNoteIcon	from './icons/new-note'
import TagsIcon from './icons/tags'
import NoteDisplayMixin from './note-display-mixin'
import classNames	from 'classnames'

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
	},

	onAuthChanged: function() {
		this.props.actions.authChanged( {
			authorized: this.props.client.isAuthorized()
		} );
	},

	onSelectNote: function( noteId ) {
		this.props.actions.loadAndSelectNote( {
			noteBucket: this.props.noteBucket,
			noteId
		} );
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
	},

	onNoteUpdate: function( noteId, data, original, patch ) {
		this.props.actions.noteUpdated( {
			noteBucket: this.props.noteBucket,
			noteId, data, original, patch
		} );
	},

	onTagsIndex: function() {
		this.props.actions.loadTags( {
			tagBucket: this.props.tagBucket
		} );
	},

	onSelectTag: function( tag ) {
		this.props.actions.selectTag( { tag } );
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
	},

	onReorderTags: function( tags ) {
		this.props.actions.reorderTags( {
			tagBucket: this.props.tagBucket,
			tags
		} );
	},

	onSearch: function( filter ) {
		this.props.actions.search( { filter } );
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
		this.props.actions.trashNote( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	onRestoreNote: function( note ) {
		this.props.actions.restoreNote( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	onRevisions: function( note ) {
		this.props.actions.noteRevisions( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	render: function() {
		var state = this.props.appState;
		var { settings } = this.props;
		var notes = this.filterNotes();

		var classes = classNames( 'simplenote-app', {
			'touch-enabled': ( 'ontouchstart' in document.body ),
			'note-open': state.note,
			'note-info-open': state.showNoteInfo,
			'navigation-open': state.showNavigation
		} );

		return (
			<div className="app">
				{ state.authorized ?
						<div className={classes}>
							<NavigationBar
								onSelectAllNotes={() => this.props.actions.selectAllNotes() }
								onSelectTrash={() => this.props.actions.selectTrash() }
								onSelectTag={this.onSelectTag}
								onSettings={this.onSettings}
								onEditTags={() => this.props.actions.editTags() }
								onRenameTag={this.onRenameTag}
								onTrashTag={this.onTrashTag}
								onReorderTags={this.onReorderTags}
								editingTags={state.editingTags}
								tags={state.tags} />
							<div className="source-list">
								<div className="search-bar">
									<div className="icon-button" tabIndex="-1" onClick={() => this.props.actions.toggleNavigation() }>
										<TagsIcon />
									</div>
									<SearchField onSearch={this.onSearch} placeholder={state.listTitle} />
									<div className={classNames( 'icon-button', { disabled: state.showTrash } )} tabIndex="-1" onClick={this.onNewNote}>
										<NewNoteIcon />
									</div>
								</div>
								<NoteList notes={notes} selectedNoteId={state.selectedNoteId} onSelectNote={this.onSelectNote} onPinNote={this.onPinNote} />
							</div>
							<NoteEditor
								editorMode={state.editorMode}
								note={state.note}
								revisions={state.revisions}
								markdownEnabled={settings.markdownEnabled}
								onSetEditorMode={this.onSetEditorMode}
								onSignOut={this.props.onSignOut}
								onUpdateContent={this.onUpdateContent}
								onUpdateNoteTags={this.onUpdateNoteTags}
								onTrashNote={this.onTrashNote}
								onRestoreNote={this.onRestoreNote}
								onRevisions={this.onRevisions}
								onCloseNote={() => this.props.actions.closeNote()}
								onNoteInfo={() => this.props.actions.toggleNoteInfo()} />
							<NoteInfo
								note={state.note}
								onPinNote={this.onPinNote}
								onMarkdownNote={this.onMarkdownNote} />
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

	renderDialog( dialog ) {
		var DialogComponent = Dialogs[ dialog.type ];

		return (
			<DialogComponent {...this.props} dialog={dialog} />
		);
	}
} ) );
