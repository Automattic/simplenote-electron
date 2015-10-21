import React from 'react'
import NoteListItem from './note-list-item'
import store from './flux/store';
import { getSelectedNote } from './flux/app_state';
import { actions } from './flux/app_state';

export default React.createClass({

	getDefaultProps: function() {
		return {
			notes: [],
		};
	},

	onSelectNote: function(noteId) {
		store.dispatch( actions.selectNote( noteId ) );
	},

	render: function() {
		var selectedNoteId = getSelectedNote();
		var onSelect = this.onSelectNote;
		return (
			<div className="note-list" tabIndex="1">
			{this.props.notes.map(function(note) {
				return (
					<NoteListItem selected={note.id == selectedNoteId} key={note.id} note={note} onSelectNote={onSelect} />
				)
			})}
			</div>
		);
	}

});
