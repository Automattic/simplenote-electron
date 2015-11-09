import React from 'react'
import NoteDetail from './note-detail'
import TagField from './tag-field'
import NoteToolbar from './note-toolbar'
import RevisionSelector from './revision-selector'

export default React.createClass({

	getDefaultProps: function() {
		return {
			note: {
				data: {
					tags: []
				}
			},
			revisions: null,
			onUpdateContent: function() {},
			onUpdateNoteTags: function() {},
			onTrashNote: function() {},
			onRestoreNote: function() {},
			onRevisions: function() {},
			onSignOut: function() {},
			onCloseNote: function() {},
			onNoteInfo: function() {}
		};
	},

	componentWillReceiveProps: function() {
		this.setState({revision: null});
	},

	getInitialState: function() {
		return {
			revision: null
		}
	},

	withNote: function(fn) {
		var note = this.props.note;
		return function() {
			var args = [note].concat([].slice.call(arguments));
			fn.apply(null, args);
		};
	},

	onViewRevision: function(revision) {
		this.setState({revision: revision});
	},

	onSelectRevision: function(revision) {
		console.log("Accept revision: ", revision);
	},

	render: function() {
		var revisions = this.props.revisions;
		var revision = this.state.revision;
		var note = this.state.revision ? this.state.revision : this.props.note;
		var tags = note && note.data && note.data.tags ? note.data.tags : [];
		return (
			<div className="detail">
				<NoteToolbar
					note={this.props.note}
					onTrashNote={this.props.onTrashNote}
					onRestoreNote={this.props.onRestoreNote}
					onRevisions={this.props.onRevisions}
					onSignOut={this.props.onSignOut}
					onCloseNote={this.props.onCloseNote}
					onNoteInfo={this.props.onNoteInfo} />
				<div className="toolbar-compact">
					<TagField ref="tags"
						tags={tags}
						onUpdateNoteTags={this.withNote(this.props.onUpdateNoteTags)} />
				</div>
				<div className="panel">
					<NoteDetail ref="detail"
						note={note}
						onChangeContent={this.withNote(this.props.onUpdateContent)} />
				</div>
				{when(revisions, function() {
					return (
						<RevisionSelector
							revisions={revisions}
							onViewRevision={this.onViewRevision}
							onSelectRevision={this.onSelectRevision} />
					)
				}, this)}
			</div>
		)
	}
});

function when(test, func, ctx) {
	if (typeof test == 'function') {
		test = test();
	}
	if (test) {
		return func.apply(ctx);
	}
}
