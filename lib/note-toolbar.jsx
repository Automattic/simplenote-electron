import React, { PropTypes } from 'react'
import BackIcon from './icons/back'
import InfoIcon from './icons/info'
import RevisionsIcon from './icons/revisions'
import TrashIcon from './icons/trash'
import ShareIcon from './icons/share'

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onDeleteNoteForever: PropTypes.func.isRequired,
		onRevisions: PropTypes.func.isRequired,
		onShareNote: PropTypes.func.isRequired,
		onCloseNote: PropTypes.func.isRequired,
		onNoteInfo: PropTypes.func.isRequired
	},

	render() {
		const { note } = this.props;
		const isTrashed = !!( note && note.data.deleted );

		return isTrashed ? this.renderTrashed() : this.renderNormal();
	},

	renderNormal() {
		const { note } = this.props;

		return (
			<div className="note-toolbar">
				<div className="note-toolbar-icon note-toolbar-back"><button type="button" className="button button-borderless" onClick={this.props.onCloseNote}><BackIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="button button-borderless" onClick={this.props.onRevisions.bind( null, note )}><RevisionsIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="button button-borderless" onClick={this.props.onTrashNote.bind( null, note )}><TrashIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="button button-borderless" onClick={this.props.onShareNote.bind( null, note )}><ShareIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="button button-borderless" onClick={this.props.onNoteInfo}><InfoIcon /></button></div>
			</div>
		);
	},

	renderTrashed() {
		const { note } = this.props;

		return (
			<div className="note-toolbar-trashed">
				<div className="note-toolbar-text"><button type="button" className="button button-compact button-danger" onClick={this.props.onDeleteNoteForever.bind( null, note )}>Delete Forever</button></div>
				<div className="note-toolbar-text"><button type="button" className="button button-primary button-compact" onClick={this.props.onRestoreNote.bind( null, note )}>Restore Note</button></div>
			</div>
		);
	}

} );
