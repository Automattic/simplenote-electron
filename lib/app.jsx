import React from 'react';
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { actions } from './flux/app_state'
import NoteList from './note-list'
import NoteEditor	from './note-editor'
import SearchField from './search-field'
import NavigationBar from './navigation-bar'
import Auth from './auth'
import NewNoteIcon	from './icons/new-note'
import TagsIcon from './icons/tags'
import NoteDisplayMixin from './note-display-mixin'
import classNames	from 'classnames'
import simperium from 'simperium'
import PopOver from "react-popover"

function mapStateToProps(state) {
	return state;
}

function mapDispatchToProps(dispatch) {
	return { actions: bindActionCreators( actions, dispatch ) };
}

export default connect( mapStateToProps, mapDispatchToProps )( React.createClass({

	mixins: [NoteDisplayMixin],

	getDefaultProps: function() {
		return {
			onAuthenticate: () => {},
			onSignOut: () => {}
		};
	},

	getInitialState: function() {
		return {
			note_id: null,
			notes: [],
			tags: [],
			showTrash: false,
			listTitle: "All Notes",
			authorized: this.props.client.isAuthorized(),
			showNavigation: false,
			showNoteInfo: false,
			editingTags: false
		};
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

	_onAddNote: function(e, note) {
		this.onNotesIndex();
		this.onSelectNote(note.id);
	},

	_onGetNote: function(e, note) {
		this.setState({note: note, note_id: note.id, revisions: null});
	},

	_closeNote: function() {
		this.setState({note: null, note_id: null});
	},

	onAuthChanged: function() {
		var authorized = this.props.client.isAuthorized();
		this.setState({authorized: authorized})
		if (!authorized) {
			this.setState({notes: [], tags: []});
		}
	},

	onSelectNote: function(note_id) {
		this.props.noteBucket.get(note_id, this._onGetNote);
		this.onHideNavigation();
	},

	onNotesIndex: function() {
		var done = this.onFindNotes;
		this.props.noteBucket.query(function(db) {
			var notes = [];
			db.transaction('note').objectStore('note').index('pinned-sort').openCursor(null, 'prev').onsuccess = function(e) {
				var cursor = e.target.result;
				if (cursor) {
					notes.push(cursor.value);
					cursor.continue();
				} else {
					done(null, notes);
				}
			};
		});
	},

	onNoteRemoved: function() {
		this.onNotesIndex();
	},

	onNewNote: function() {
		if (this.state.showTrash) {
			return;
		}

		// insert a new note into the store and select it
		var ts = (new Date()).getTime()/1000;
		this.props.noteBucket.add({
			content: "",
			deleted: false,
			systemTags: [],
			creationDate: ts,
			modificationDate: ts,
			shareURL: "",
			publishURL: "",
			tags: [].concat(this.state.tag ? this.state.tag.data.name : [])
		}, this._onAddNote);
	},

	onNoteUpdate: function(id, data, original, patch) {

		// refresh the notes list
		this.onNotesIndex();

		if (this.state.note_id == id && !!patch) {

			// working is the state of the note in the editor
			var working = this.state.note.data;

			// diff of working and original will produce the modifications the client has currently made
			var working_diff = simperium.util.change.diff(original, working);
			// generate a patch that composes both the working changes and upstream changes
			var patch = simperium.util.change.transform(working_diff, patch, original);
			// apply the new patch to the upstream data
			var rebased = simperium.util.change.apply(patch, data);

			// TODO: determine where the cursor is and put it in the correct place
			// when applying the rebased content

			this.state.note.data = rebased;

			// immediately save the content
			this.setState({note: this.state.note});

			var note = this.state.note;
			this.onUpdateContent(note, note.data.content);
		}
	},

	onFindNotes: function(e, notes) {
		this.setState({notes: notes});
	},

	onFindTags: function(e, tags) {
		this.setState({tags: tags});
	},

	onNoteInfo: function(evt) {
		if (!this.state.note) {
			return;
		}
		this.setState({showNoteInfo: {context: evt.currentTarget.getBoundingClientRect()}, showNavigation: false, editingTags: false});
	},

	onHideNoteInfo: function() {
		this.setState({showNoteInfo: false});
	},

	onTagsIndex: function() {
		var done = this.onFindTags;
		this.props.tagBucket.query(function(db) {
			var tags = [];
			db.transaction('tag').objectStore('tag').openCursor(null, 'prev').onsuccess = function(e) {
				var cursor = e.target.result;
				if (cursor) {
					tags.push(cursor.value);
					cursor.continue();
				} else {
					done(null, tags);
				}
			}
		})
	},

	onToggleNavigation: function() {
		if (this.state.showNavigation) {
			this.onHideNavigation();
		}
		else {
			this.setState({showNavigation: true, showNoteInfo: false});
		}
	},

	onHideNavigation: function() {
		this.setState({showNavigation: false, editingTags: false});
	},

	onSelectAllNotes: function() {
		this.setState({
			showNavigation: false, editingTags: false,
			tag: null, showTrash: false, listTitle: "All Notes"
		});
	},

	onSelectTrash: function() {
		this.setState({
			showNavigation: false, editingTags: false,
			tag: null, showTrash: true, listTitle: "Trash"
		});
	},

	onSelectTag: function(tag) {
		this.setState({
			showNavigation: false, editingTags: false,
			tag: tag, showTrash: false, listTitle: tag.data.name
		});
	},

	onEditTags: function() {
		if (this.state.editingTags) {
			this.setState({editingTags: false});
		}
		else {
			this.setState({editingTags: true});
		}
	},

	onUpdateTags: function(tags) {
	},

	onSearch: function(v) {
		this.setState({filter: v});
	},

	filterNotes: function() {
		var query = this.state.filter,
				trash		= this.state.showTrash,
				notes		= this.state.notes || [],
				tag			= this.state.tag,
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
		if (note) {
			note.data.content = content;
			this.setState({note_id: note.id});

			// update the bucket but don't fire a sync immediately
			this.props.noteBucket.update(note.id, note.data, {sync: false});
			var commit = (function() {
				this.props.noteBucket.touch(note.id);
			}).bind(this);

			throttle(note.id, commit);
		}
	},

	onUpdateNoteTags: function(note, tags) {
		if (note) {
			note.data.tags = tags;
			this.props.noteBucket.update(note.id, note.data);
			this.setState({note_id: note.id});
		}
	},

	onTrashNote: function(note) {
		if (note) {
			note.data.deleted = true;
			this.props.noteBucket.update(note.id, note.data);
			this.setState({note_id: null, note: null});
		}
	},

	onRestoreNote: function(note) {
		if (note) {
			note.data.deleted = false;
			this.props.noteBucket.update(note.id, note.data);
			this.setState({note_id: null});
		}
	},

	onRevisions: function(note) {
		this.props.noteBucket.getRevisions(note.id, this._loadRevisions);
	},

	_loadRevisions: function(e, revisions) {
		if (e) return console.warn("Failed to load revisions", e);
		this.setState({revisions: revisions});
	},

	authorized: function(fn) {
		if (this.state.authorized) return fn();
	},

	unauthorized: function(fn) {
		if (!this.state.authorized) return fn();
	},

	render: function() {

		var notes = this.filterNotes();
		var tags = this.tag
		var note = this.state.note;
		var revisions = this.state.revisions;

		var classes = classNames( 'simplenote-app', {
			'touch-enabled': ('ontouchstart' in document.body),
			'note-open': this.state.note,
			'navigation-open': this.state.showNavigation
		} );

		return (
			<div className="app">
				{ this.authorized( () => {
					return (
						<div className={classes}>
							<NavigationBar
								onSelectAllNotes={this.onSelectAllNotes}
								onSelectTrash={this.onSelectTrash}
								onSelectTag={this.onSelectTag}
								onEditTags={this.onEditTags}
								onUpdateTags={this.onUpdateTags}
								editingTags={this.state.editingTags}
								tags={this.state.tags} />
							<div className="source-list">
								<div className="search-bar">
									<div className="icon-button" tabIndex="-1" onClick={this.onToggleNavigation}>
										<TagsIcon />
									</div>
									<SearchField onSearch={this.onSearch} placeholder={this.state.listTitle} />
									<div className={classNames('icon-button', {disabled: this.state.showTrash})} tabIndex="-1" onClick={this.onNewNote}>
										<NewNoteIcon />
									</div>
								</div>
								<div className="panel">
									<NoteList ref="list" notes={notes} onSelectNote={this.onSelectNote} note={note} />
								</div>
							</div>
							<NoteEditor
								note={note}
								revisions={this.state.revisions}
								onSignOut={this.props.onSignOut}
								onUpdateContent={this.onUpdateContent}
								onUpdateNoteTags={this.onUpdateNoteTags}
								onTrashNote={this.onTrashNote}
								onRestoreNote={this.onRestoreNote}
								onRevisions={this.onRevisions}
								onCloseNote={this._closeNote}
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
		if (!this.state.showNoteInfo) {
			return;
		}

		var popoverOptions = this.state.showNoteInfo,
				style = {
					overflow: 'auto',
					maxWidth: '320px',
					maxHeight: '100%',
					margin: '0'
				};

		return (
			<PopOver
				onClosePopover={this.onHideNoteInfo}
				context={popoverOptions.context}>
				<pre style={style}>{JSON.stringify(this.state.note, null, "	 ")}</pre>
			</PopOver>
		);

	}
} ) );

var timers = {};

function timer(id) {
	var t = timers[id];
	if (!t) timers[id] = { start: (new Date()).getTime(), id: -1 }; 
	return timers[id];
};

function clearTimer(id) {
	delete timers[id];
}

var maxTime = 3000;

function throttle(id, cb) {
	var t = timer(id),
			now = (new Date()).getTime(),
			ellapsed = now - t.start,
			perform = function() {
				var t = timer(id),
						now = (new Date()).getTime(),
						ellapsed = now - t.start;

				cb();
				clearTimer(id);
			};

	clearTimeout(timer.id);

	if (ellapsed > maxTime) return perform();

	timer.id = setTimeout(perform, maxTime);
}

function and(fn, fn2) {
	return function(o) {
		if (!fn(o)) return false;
		return fn2(o);
	};
}
