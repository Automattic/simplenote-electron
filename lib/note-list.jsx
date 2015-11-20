import React from 'react'
import NoteListItem from './note-list-item'

export default React.createClass({

	getDefaultProps: function() {
		return {
			notes: [],
			selectedNoteId: null
		};
	},

	onSelectNote: function(noteId) {
		this.props.onSelectNote(noteId);
	},

	render: function() {
		var selectedNoteId = this.props.selectedNoteId;
		return (
			<div className="note-list" tabIndex="1">
				{this.props.notes.map(note =>
					<NoteListItem key={note.id} note={note} selected={note.id === selectedNoteId} onSelectNote={this.onSelectNote.bind(this, note.id)} />
				)}
			</div>
		);
	}

});
