var React						 = require('react');
var NoteList				 = require('./note_list.jsx');
var NoteEditor			 = require('./note_editor.jsx');
var TagMenu					 = require('./tag_menu.jsx');
var SearchField			 = require('./search_field.jsx');
var NavigationBar		 = require('./navigation_bar.jsx');
var Auth						 = require('./auth.jsx');
var PlusIcon				 = require('./icons/plus.jsx');
var NoteDisplayMixin = require('./note_display_mixin.js');
const classNames		 = require( 'classnames' );
var simperium				 = require('simperium');


module.exports = React.createClass({

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
			showTagMenu: false,
			showNoteInfo: false
		};
	},

	componentDidMount: function() {

		window.addEventListener('popstate', this._onPopState);

		this.props.notes
			.on('index', this.onNotesIndex)
			.on('update', this.onNoteUpdate)
			.on('remove', this.onNoteRemoved);

		this.props.tags
			.on('index', this.onTagsIndex)
			.on('update', this.onTagsIndex);

		this.props.client
			.on('authorized', this.onAuthChanged)
			.on('unauthorized', this.onAuthChanged);

		this.onNotesIndex();

	},

	_onPopState: function(event) {
		var state = event.state;
		if (state) {
			this.props.notes.get(state.id, this._onGetNote);
		} else {
			this.setState({note: null});
		}
	},

	_onAddNote: function(e, note) {
		this.onNotesIndex();
		this.onSelectNote(note.id);
	},

	_onGetNote: function(e, note) {
		this.setState({note: note, note_id: note.id, revisions: null});
	},

	_closeNote: function() {
		// this.replaceState(null, "Simplenote", "/");
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
		this.props.notes.get(note_id, this._onGetNote);
	},

	onNotesIndex: function() {
		var done = this.onFindNotes;
		this.props.notes.query(function(db) {
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
		// insert a new note into the store and select it
		var ts = (new Date()).getTime()/1000;
		this.props.notes.add({
			content: "",
			deleted: false,
			systemTags: [],
			creationDate: ts,
			modificationDate: ts,
			shareURL: "",
			publishURL: "",
			tags: []
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

			var notes = this.props.notes, note = this.state.note;
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
		this.setState({showNoteInfo: {context: evt.currentTarget.getBoundingClientRect()}, showTagMenu: false});
	},

	onHideNoteInfo: function() {
		this.setState({showNoteInfo: false});
	},

	onTagsIndex: function() {
		var done = this.onFindTags;
		this.props.tags.query(function(db) {
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

	onDisplayTagsMenu: function(evt) {

		if (this.state.showTagMenu) {
			return this.setState({showTagMenu: false, tagMenuContext: null});
		}

		var target = evt.currentTarget,
				rect = target.getBoundingClientRect();
		this.setState({showTagMenu: true, showNoteInfo: false, tagMenuContext: rect});
	},

	onHideTagsMenu: function() {
		this.setState({showTagMenu: false, tagMenuContext: null});
	},

	onSelectTag: function(tag, index) {
		switch (index) {
		case 0:
			this.setState({tag: null, showTrash: false, listTitle: "All Notes"});
			break;
		case 1:
			this.setState({tag: null, showTrash: true, listTitle: "Trash"});
			break;
		default:
			this.setState({tag: tag, showTrash: false, listTitle: tag.data.name});
		}
		this.onHideTagsMenu();
	},

	onSearch: function(v) {
		this.setState({filter: v});
	},

	filterNotes: function() {
		var query = this.state.filter,
				trash = this.state.showTrash,
				notes = this.state.notes || [],
				filter = (note) => { return trash || !note.data.deleted };

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
			this.props.notes.update(note.id, note.data, {sync: false});
			var commit = (function() {
				this.props.notes.touch(note.id);
			}).bind(this);

			throttle(note.id, commit);
		}
	},

	onUpdateTags: function(note, tags) {
		if (note) {
			note.data.tags = tags;
			this.props.notes.update(note.id, note.data);
			this.setState({note_id: note.id});
		}
	},

	onTrashNote: function(note) {
		if (note) {
			note.data.deleted = true;
			this.props.notes.update(note.id, note.data);
			this.setState({note_id: null});
		}
	},

	onRestoreNote: function(note) {
		if (note) {
			note.data.deleted = false;
			this.props.notes.update(note.id, note.data);
			this.setState({note_id: null});
		}
	},

	onRevisions: function(note) {
		this.props.notes.getRevisions(note.id, this._loadRevisions);
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
			'note-open': this.state.note,
			'tags-open': this.state.showTagMenu
		} );

		return (
			<div className="app">
				{ this.authorized( () => {
					return (
						<div className={classes}>
							<div className="source-list">
								<div className="toolbar">
									<NavigationBar title={this.state.listTitle}>
										<div className="button" tabIndex="-1" onClick={this.onNewNote}>
											<PlusIcon />
										</div>
									</NavigationBar>
								</div>
								<div className="toolbar-compact">
									<SearchField onSearch={this.onSearch} />
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
								onUpdateTags={this.onUpdateTags}
								onTrashNote={this.onTrashNote}
								onRestoreNote={this.onRestoreNote}
								onRevisions={this.onRevisions}
								onCloseNote={this._closeNote} />
						</div>
					)
				}) }
				{ this.unauthorized( () => {
					return <Auth onAuthenticate={this.props.onAuthenticate} />
				})}
			</div>
		)
	}
});

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