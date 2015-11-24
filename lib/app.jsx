import React, { PropTypes } from 'react';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import appState from './flux/app-state'
import NoteList from './note-list'
import NoteEditor	from './note-editor'
import SearchField from './search-field'
import NavigationBar from './navigation-bar'
import Auth from './auth'
import NewNoteIcon	from './icons/new-note'
import TagsIcon from './icons/tags'
import NoteDisplayMixin from './note-display-mixin'
import classNames	from 'classnames'
import PopOver from "react-popover"

function mapStateToProps(state) {
	return state;
}

function mapDispatchToProps(dispatch) {
	return { actions: bindActionCreators( appState.actionCreators, dispatch ) };
}

export default connect( mapStateToProps, mapDispatchToProps )( React.createClass({

	mixins: [NoteDisplayMixin],

	propTypes: {
		actions: PropTypes.object.isRequired,
		appState: PropTypes.object.isRequired,

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
			.on('index', this.onNotesIndex)
			.on('update', this.onNoteUpdate)
			.on('remove', this.onNoteRemoved);

		this.props.tagBucket
			.on('index', this.onTagsIndex)
			.on('update', this.onTagsIndex);

		this.props.client
			.on('authorized', this.onAuthChanged)
			.on('unauthorized', this.onAuthChanged);

		this.onNotesIndex();
		this.onTagsIndex();
	},

	onAuthChanged: function() {
		this.props.actions.authChanged( {
			authorized: this.props.client.isAuthorized()
		} );
	},

	onSelectNote: function(noteId) {
		this.props.actions.loadAndSelectNote( {
			noteBucket: this.props.noteBucket,
			noteId
		} );
	},

	onPinNote: function(note, pin = true) {
		this.props.actions.pinNote( {
			noteBucket: this.props.noteBucket,
			note, pin
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

	onNoteUpdate: function(noteId, data, original, patch) {
		this.props.actions.noteUpdated( {
			noteBucket: this.props.noteBucket,
			noteId, data, original, patch
		} );
	},

	onNoteInfo: function(evt) {
		this.props.actions.showNoteInfo( {
			context: evt.currentTarget.getBoundingClientRect()
		} );
	},

	onTagsIndex: function() {
		this.props.actions.loadTags( {
			tagBucket: this.props.tagBucket
		} );
	},

	onSelectTag: function(tag) {
		this.props.actions.selectTag( { tag } );
	},

	onRenameTag: function(tag, name) {
		this.props.actions.renameTag( {
			tagBucket: this.props.tagBucket,
			noteBucket: this.props.noteBucket,
			tag, name
		} );
	},

	onTrashTag: function(tag) {
		this.props.actions.trashTag( {
			tagBucket: this.props.tagBucket,
			noteBucket: this.props.noteBucket,
			tag
		} );
	},

	onReorderTags: function(tags) {
		this.props.actions.reorderTags( {
			tagBucket: this.props.tagBucket,
			tags
		} );
	},

	onSearch: function(filter) {
		this.props.actions.search( { filter } );
	},

	filterNotes: function() {
		var appState = this.props.appState;
		var query = appState.filter,
				trash		= appState.showTrash,
				notes		= appState.notes || [],
				tag			= appState.tag,
				filter	= (note) => {
					// if trash is being viewed, return trashed notes
					if (trash) {
						return note.data.deleted;
					}
					// if not in trash and note is deleted, don't show it
					if (note.data.deleted) {
						return false;
					}
					// if tag is selected only return those tags
					if (tag) {
						var tags = note.data.tags.map((t)=>{return t.toLowerCase()});
						var includes = tags.indexOf(tag.id) >= 0;
						return includes;
					}
					return !note.data.deleted;
				};

		if (query) {
			var reg = new RegExp(query, 'gi');
			filter = and(filter, function(note){
				if (note.data && note.data.content) return reg.test(note.data.content);
				return false;
			});
		}

		return notes.filter(filter);
	},

	onUpdateContent: function(note, content) {
		this.props.actions.updateNoteContent( {
			noteBucket: this.props.noteBucket,
			note, content
		} );
	},

	onUpdateNoteTags: function(note, tags) {
		this.props.actions.updateNoteTags( {
			noteBucket: this.props.noteBucket,
			note, tags
		} );
	},

	onTrashNote: function(note) {
		this.props.actions.trashNote( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	onRestoreNote: function(note) {
		this.props.actions.restoreNote( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	onRevisions: function(note) {
		this.props.actions.noteRevisions( {
			noteBucket: this.props.noteBucket,
			note
		} );
	},

	authorized: function(fn) {
		if (this.props.appState.authorized) return fn();
	},

	unauthorized: function(fn) {
		if (!this.props.appState.authorized) return fn();
	},

	render: function() {
		var appState = this.props.appState;
		var notes = this.filterNotes();
		var tags = this.tag
		var note = appState.note;
		var revisions = appState.revisions;

		var classes = classNames( 'simplenote-app', {
			'touch-enabled': ('ontouchstart' in document.body),
			'note-open': appState.note,
			'navigation-open': appState.showNavigation
		} );

		return (
			<div className="app">
				{ this.authorized( () => {
					return (
						<div className={classes}>
							<NavigationBar
								onSelectAllNotes={() => this.props.actions.selectAllNotes() }
								onSelectTrash={() => this.props.actions.selectTrash() }
								onSelectTag={this.onSelectTag}
								onEditTags={() => this.props.actions.editTags() }
								onRenameTag={this.onRenameTag}
								onTrashTag={this.onTrashTag}
								onReorderTags={this.onReorderTags}
								editingTags={appState.editingTags}
								tags={appState.tags} />
							<div className="source-list">
								<div className="search-bar">
									<div className="icon-button" tabIndex="-1" onClick={() => this.props.actions.toggleNavigation() }>
										<TagsIcon />
									</div>
									<SearchField onSearch={this.onSearch} placeholder={appState.listTitle} />
									<div className={classNames('icon-button', {disabled: appState.showTrash})} tabIndex="-1" onClick={this.onNewNote}>
										<NewNoteIcon />
									</div>
								</div>
								<NoteList notes={notes} selectedNoteId={appState.selectedNoteId} onSelectNote={this.onSelectNote} onPinNote={this.onPinNote} />
							</div>
							<NoteEditor
								note={note}
								revisions={appState.revisions}
								onSignOut={this.props.onSignOut}
								onUpdateContent={this.onUpdateContent}
								onUpdateNoteTags={this.onUpdateNoteTags}
								onTrashNote={this.onTrashNote}
								onRestoreNote={this.onRestoreNote}
								onRevisions={this.onRevisions}
								onCloseNote={() => this.props.actions.closeNote()}
								onNoteInfo={this.onNoteInfo} />
							{ this.renderNoteInfoPopover() }
						</div>
					)
				}) }
				{ this.unauthorized( () => {
					return <Auth onAuthenticate={this.props.onAuthenticate} />
				})}
			</div>
		)
	},

	renderNoteInfoPopover: function() {
		var popoverOptions = this.props.appState.showNoteInfo;
		if (!popoverOptions) {
			return;
		}

		let style = {
			overflow: 'auto',
			maxWidth: '320px',
			maxHeight: '100%',
			margin: '0'
		};

		return (
			<PopOver
				onClosePopover={() => this.props.actions.hideNoteInfo() }
				context={popoverOptions.context}>
				<pre style={style}>{JSON.stringify(this.props.appState.note, null, "	")}</pre>
			</PopOver>
		);

	}
} ) );

function and(fn, fn2) {
	return function(o) {
		if (!fn(o)) return false;
		return fn2(o);
	};
}
