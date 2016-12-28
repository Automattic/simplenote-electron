import React, { PropTypes } from 'react'
import BackIcon from './icons/back'
import InfoIcon from './icons/info'
import RevisionsIcon from './icons/revisions'
import TrashIcon from './icons/trash'
import ShareIcon from './icons/share'
import { connect } from 'react-redux';
import appState from './flux/app-state';
import { tracks } from './analytics'
import filterNotes from './utils/filter-notes';

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
		setIsViewingRevisions: PropTypes.func.isRequired
	},

	showRevisions: function() {
		this.props.setIsViewingRevisions( true );
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

const {
	closeNote,
	deleteNoteForever,
	noteRevisions,
	restoreNote,
	showDialog,
	toggleNoteInfo,
	trashNote,
} = appState.actionCreators;
const { recordEvent } = tracks;

// gets the index of the note located before the currently selected one
function getPreviousNoteIndex( note, filteredNotes ) {
	const noteIndex = function( filteredNote ) {
		return note.id === filteredNote.id;
	};
	return Math.max( filteredNotes.findIndex( noteIndex ) - 1, 0 );
}

const mapStateToProps = ( { appState: state } ) => {
	const filteredNotes = filterNotes( state );
	const noteIndex = Math.max( state.previousIndex, 0 );
	const note = state.note ? state.note : filteredNotes[ noteIndex ];
	const previousIndex = getPreviousNoteIndex( note, filteredNotes );
	return { note, previousIndex };
};

const mapDispatchToProps = ( dispatch, { noteBucket, previousIndex } ) => ( {
	onCloseNote: () =>
		dispatch( closeNote() ),
	onDeleteNoteForever: note =>
		dispatch( deleteNoteForever( { noteBucket, note, previousIndex } ) ),
	onNoteInfo: () =>
		dispatch( toggleNoteInfo() ),
	onRestoreNote: note => {
		dispatch( restoreNote( { noteBucket, note, previousIndex } ) );
		recordEvent( 'editor_note_restored' );
	},
	onRevisions: note => {
		dispatch( noteRevisions( { noteBucket, note } ) );
		recordEvent( 'editor_versions_accessed' );
	},
	onShareNote: note =>
		dispatch( showDialog( {
			dialog: { modal: true, type: 'Share' },
			params: { note },
		} ) ),
	onTrashNote: note => {
		dispatch( trashNote( { noteBucket, note, previousIndex } ) );
		recordEvent( 'editor_note_deleted' );
	},
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteToolbar );
