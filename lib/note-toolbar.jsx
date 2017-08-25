import React, { PropTypes } from 'react'
import { connect } from 'react-redux';
import BackIcon from './icons/back'
import InfoIcon from './icons/info'
import RevisionsIcon from './icons/revisions'
import TrashIcon from './icons/trash'
import ShareIcon from './icons/share'
import appState from './flux/app-state';
import { tracks } from './analytics'
import getActiveNote from './utils/get-active-note';
import { selectRevision } from './state/revision/actions';

const { noteRevisions } = appState.actionCreators;
const { recordEvent } = tracks;

export const NoteToolbar = React.createClass( {

	propTypes: {
		note: PropTypes.object,
		onTrashNote: PropTypes.func.isRequired,
		onRestoreNote: PropTypes.func.isRequired,
		onDeleteNoteForever: PropTypes.func.isRequired,
		onRevisions: PropTypes.func.isRequired,
		onShareNote: PropTypes.func.isRequired,
		onCloseNote: PropTypes.func.isRequired,
		onNoteInfo: PropTypes.func.isRequired,
	},

	showRevisions: function() {
		this.props.onRevisions( this.props.note );
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
				<div className="note-toolbar-icon note-toolbar-back"><button type="button" title="Back" className="button button-borderless" onClick={this.props.onCloseNote}><BackIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" title="History" className="button button-borderless" onClick={this.showRevisions}><RevisionsIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" title="Share" className="button button-borderless" onClick={this.props.onShareNote.bind( null, note )}><ShareIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" title="Trash" className="button button-borderless" onClick={this.props.onTrashNote.bind( null, note )}><TrashIcon /></button></div>
				<div className="note-toolbar-icon"><button type="button" title="Info" className="button button-borderless" onClick={this.props.onNoteInfo}><InfoIcon /></button></div>
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

const mapStateToProps = ( { appState: state } ) => ( {
	note: getActiveNote( state ),
} );

const mapDispatchToProps = ( dispatch, { noteBucket } ) => ( {
	onRevisions: note => {
		dispatch( noteRevisions( { noteBucket, note } ) );
		dispatch( selectRevision( note ) );
		recordEvent( 'editor_note_restored' );
	},
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteToolbar );
