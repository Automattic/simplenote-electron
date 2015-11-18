import React from 'react'
import BackIcon from './icons/back'
import InfoIcon from './icons/info'
import RevisionsIcon from './icons/revisions'
import TrashIcon from './icons/trash'

export default React.createClass({

	getDefaultProps: function() {
		return {
			note: {
				data: {
					tags: []
				}
			},
			revisions: null,
			onTrashNote: function() {},
			onRestoreNote: function() {},
			onRevisions: function() {},
			onSignOut: function() {},
			onCloseNote: function() {},
			onNoteInfo: function() {}
		};
	},

	withNote: function(fn) {
		var note = this.props.note;
		return function() {
			var args = [note].concat([].slice.call(arguments));
			fn.apply(null, args);
		};
	},

	isTrashed: function(fn) {
		var note = this.props.note;
		if (note && note.data.deleted) {
			return fn.call(this, note);
		}
	},

	isNotTrashed: function(fn) {
		var note = this.props.note;
		if (note && !note.data.deleted) {
			return fn.call(this, note);
		}
	},

	render: function() {
		return (
			<div className="toolbar">
				<div className="detail-toolbar">
					<div ref="responsive-back" onClick={this.props.onCloseNote} className="icon-button backButton" tabIndex="-1"><BackIcon /></div>
					<div ref="info" tabIndex="-1" className="icon-button infoButton" onClick={this.props.onNoteInfo}><InfoIcon /></div>
					<div ref="revisions" tabIndex="-1" className="icon-button revisionsButton" onClick={this.withNote(this.props.onRevisions)}><RevisionsIcon /></div>
					{ this.isNotTrashed(function() {
						return (
							<div ref="trash" tabIndex="-1" className="icon-button trashButton" onClick={this.withNote(this.props.onTrashNote)}><TrashIcon /></div>
						)
					})}
					{ this.isTrashed(function() {
						return (
							<div ref="trash" tabIndex="-1" className="icon-button trashButton" onClick={this.withNote(this.props.onRestoreNote)}>Restore</div>
						)
					})}
					<div className="space" style={{"flex": "1 1 auto", "visibility": "hidden"}}></div>
					<div ref="logout" tabIndex="-1" className="text-button signoutButton" onClick={this.props.onSignOut}>Sign Out</div>
				</div>
			</div>
		)
	}
});