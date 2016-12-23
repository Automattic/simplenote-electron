import React, { PropTypes } from 'react';
import NoteDisplayMixin from './note-display-mixin';
import PublishIcon from './icons/feed';
import classNames from 'classnames';
import { get, isEmpty } from 'lodash';
import { connect } from 'react-redux';
import appState from './flux/app-state';
import { tracks } from './analytics'
import filterNotes from './utils/filter-notes';

const NoteList = React.createClass( {

	mixins: [ NoteDisplayMixin ],

	propTypes: {
		notes: PropTypes.array.isRequired,
		selectedNoteId: PropTypes.any,
		onSelectNote: PropTypes.func.isRequired,
		onPinNote: PropTypes.func.isRequired,
		noteDisplay: PropTypes.string.isRequired,
		onEmptyTrash: PropTypes.any.isRequired,
		showTrash: PropTypes.bool,
	},

	render() {
		var { selectedNoteId, onSelectNote, onEmptyTrash, noteDisplay, showTrash } = this.props;

		const listItemsClasses = classNames( 'note-list-items', noteDisplay );

		return (
			<div className="note-list">
				<div className={listItemsClasses}>
					{this.props.notes.map( note => {
						let text = this.noteTitleAndPreview( note );
						const isPublished = ! isEmpty( note.data.publishURL );
						const showPublishIcon = isPublished && ( 'condensed' !== noteDisplay );

						let classes = classNames( 'note-list-item', {
							'note-list-item-selected': selectedNoteId === note.id,
							'note-list-item-pinned': note.pinned,
							'published-note': isPublished
						} );

						return (
							<div key={note.id} className={classes}>
								<div className="note-list-item-pinner" tabIndex="0" onClick={this.onPinNote.bind( this, note )}></div>
								<div className="note-list-item-text theme-color-border" tabIndex="0" onClick={onSelectNote.bind( null, note.id )}>
									<div className="note-list-item-title">
										<span>{text.title}</span>
										{ showPublishIcon &&
											<div className="note-list-item-published-icon"><PublishIcon /></div> }
									</div>
									<div className="note-list-item-excerpt">{text.preview}</div>
								</div>
							</div>
						);
					} )}
				</div>
				{!!showTrash &&
					<div className="note-list-empty-trash theme-color-border">
						<button type="button" className="button button-borderless button-danger" onClick={onEmptyTrash}>Empty Trash</button>
					</div>
				}
			</div>
		);
	},

	onPinNote( note ) {
		this.props.onPinNote( note, !note.pinned );
	}

} );

const {
	emptyTrash,
	loadAndSelectNote,
	pinNote,
} = appState.actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ( {
	appState: state,
	settings: { noteDisplay }
} ) => {
	const filteredNotes = filterNotes( state );
	const noteIndex = Math.max( state.previousIndex, 0 );
	const selectedNote = state.note ? state.note : filteredNotes[ noteIndex ];
	const selectedNoteId = get( selectedNote, 'id', state.selectedNoteId );
	return {
		noteDisplay,
		notes: filteredNotes,
		selectedNoteId,
		showTrash: state.showTrash,
	};
};

const mapDispatchToProps = ( dispatch, { noteBucket } ) => ( {
	onEmptyTrash: () => dispatch( emptyTrash( { noteBucket } ) ),
	onSelectNote: noteId => {
		dispatch( loadAndSelectNote( { noteBucket, noteId } ) );
		recordEvent( 'list_note_opened' );
	},
	onPinNote: ( note, pin ) => dispatch( pinNote( { noteBucket, note, pin } ) ),
} );

export default connect( mapStateToProps, mapDispatchToProps )( NoteList );
