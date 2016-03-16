import React, { PropTypes } from 'react'
import NoteDisplayMixin from './note-display-mixin'
import PublishIcon from './icons/feed'
import classNames from 'classnames'
import { isEmpty } from 'lodash';

export default React.createClass( {

	mixins: [ NoteDisplayMixin ],

	propTypes: {
		notes: PropTypes.array.isRequired,
		selectedNoteId: PropTypes.any,
		onSelectNote: PropTypes.func.isRequired,
		onPinNote: PropTypes.func.isRequired,
		noteDisplay: PropTypes.string.isRequired,
		onEmptyTrash: PropTypes.any.isRequired
	},

	render() {
		var { selectedNoteId, onSelectNote, onEmptyTrash, noteDisplay } = this.props;

		const listItemsClasses = classNames( 'note-list-items', noteDisplay );

		return (
			<div className="note-list">
				<div className={listItemsClasses}>
					{this.props.notes.map( note => {
						let text = this.noteTitleAndPreview( note );
						const isPublished = ! isEmpty( note.data.publishURL );

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
										{ isPublished &&
											<div className="note-list-item-published-icon"><PublishIcon /></div> }
									</div>
									<div className="note-list-item-excerpt">{text.preview}</div>
								</div>
							</div>
						);
					} )}
				</div>
				{!!onEmptyTrash &&
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
