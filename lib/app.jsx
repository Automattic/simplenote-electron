import React from 'react';
import NoteList from './note-list'
import NoteEditor	from './note-editor'
import SearchField from './search-field'
import NavigationBar from './navigation-bar'
import Auth from './auth'
import PlusIcon	from './icons/plus'
import NoteDisplayMixin from './note-display-mixin'
import classNames	from 'classnames'
import simperium from 'simperium'
import PopOver from "react-popover"
import List from './list'

export default React.createClass({

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
		this.onTagsIndex();

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
		if (this.state.showTrash) {
			return;
		}

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
			this.setState({note_id: null, note: null});
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

	tagMenuDataSource: function() {
		return new TagMenuDataSource(this.state.tags);
	},

	renderTagListItem: function(item, index) {
		var label = "";

		switch (index) {
		case 0:
			label = "All Notes";
			break;
		case 1:
			label = "Trash";
			break;
		default:
			label = item.data.name;
		}

		return (
			<div className="tag-list-item">
				<span>{label}</span>
				<span>0</span>
			</div>
		);
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
									<NavigationBar ref="navigation" title={this.state.listTitle} onDisplayTags={this.onDisplayTagsMenu}>
										<div className={classNames('button', {disabled: this.state.showTrash})} tabIndex="-1" onClick={this.onNewNote}>
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
								onCloseNote={this._closeNote}
								onNoteInfo={this.onNoteInfo} />
							{ this.renderTagPopover() }
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

	},

	renderTagPopover: function() {

		if (!this.state.showTagMenu) {
			return;
		}

		return (
			<PopOver
				onClosePopover={this.onHideTagsMenu}
				context={this.state.tagMenuContext}>
				<div className="tag-list-filter">
					<div className="tag-list-title">View by Tag</div>
					<div className="tag-option-list">
						<List
							dataSource={this.tagMenuDataSource()}
							renderItem={this.renderTagListItem}
							onClickItem={this.onSelectTag} />
					</div>
				</div>
			</PopOver>
		);
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


function TagMenuDataSource(tags) {
	this.tags = tags || [];
}

TagMenuDataSource.prototype.totalItems = function() {
	return this.tags.length + 2;
}

TagMenuDataSource.prototype.getItem = function(index) {

	var i = index - 2;

	if (i < 0) {
		return {};
	}

	return this.tags[i];

}