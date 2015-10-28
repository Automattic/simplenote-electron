import React from 'react'
import NoteListItem from './note-list-item'

export default React.createClass({

	getDefaultProps: function() {
		return {
			notes: [],
			note: null,
			onSelectNote: function() {}
		};
	},

	onSelectNote: function(note) {
		this.props.onSelectNote(note);
	},

	render: function() {
		var selected = this.props.note;
		var onSelect = this.onSelectNote;
		return (
			<div className="note-list" tabIndex="1">
			{this.props.notes.map(function(note) {
				var isSelected = selected && note.id == selected.id;
				return (
					<NoteListItem selected={isSelected} key={note.id} note={note} onSelectNote={onSelect} />
				)
			})}
			</div>
		);
	}

});
