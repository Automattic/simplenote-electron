import React, { PropTypes } from 'react'
import BackIcon from './icons/back'
import InfoIcon from './icons/info'
import RevisionsIcon from './icons/revisions'
import TrashIcon from './icons/trash'

export default React.createClass( {

	propTypes: {
		note: PropTypes.object,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onRevisions: PropTypes.func.isRequired,
		onSignOut: PropTypes.func.isRequired,
		onCloseNote: PropTypes.func.isRequired,
		onNoteInfo: PropTypes.func.isRequired
	},

	render: function() {
		var { note } = this.props;
		var isTrashed = !!( note && note.data.deleted );

		return (
			<div className="note-toolbar">
				<div className="note-toolbar-icon note-toolbar-back"><button type="button" className="icon-button" onClick={this.props.onCloseNote}><BackIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="icon-button" onClick={this.props.onNoteInfo}><InfoIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" className="icon-button" onClick={this.props.onRevisions.bind( null, note )}><RevisionsIcon /></button></div>
				{ isTrashed ?
					<div className="note-toolbar-text"><button type="button" className="icon-button" onClick={this.props.onRestoreNote.bind( null, note )}>Restore</button></div>
				:
					<div className="note-toolbar-icon"><button type="button" className="icon-button" onClick={this.props.onTrashNote.bind( null, note) }><TrashIcon /></button></div>
				}
				<div className="note-toolbar-space"></div>
				<div className="note-toolbar-text"><button type="button" className="text-button" onClick={this.props.onSignOut}>Sign Out</button></div>
			</div>
		)
	}

} );
