import React, { PropTypes } from 'react';
import { AutoSizer, List } from 'react-virtualized';
import PublishIcon from './icons/feed';
import classNames from 'classnames';
import { debounce, get, isEmpty } from 'lodash';
import { connect } from 'react-redux';
import appState from './flux/app-state';
import { tracks } from './analytics'
import filterNotes from './utils/filter-notes';
import noteTitle from './utils/note-title';

/**
 * Delay for preventing row height calculation thrashing
 *
 * this constant was determined experimentally
 * and is open to adjustment if it doesn't find
 * the proper balance between visual updates
 * and performance impacts recomputing row heights
 *
 * @type {Number} minimum number of ms between calls to recomputeRowHeights in virtual/list
 */
const TYPING_DEBOUNCE_DELAY = 70;

/** @type {Number} height of title + vertical padding in list rows */
const ROW_HEIGHT_BASE = 24 + 18;

/** @type {Number} height of one row of preview text in list rows */
const ROW_HEIGHT_LINE = 21;

/** @type {Object.<String, Number>} maximum number of lines to display in list rows for display mode */
const maxPreviewLines = {
	comfy: 1,
	condensed: 0,
	expanded: 4,
};

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 *
 * @param {String} text The text to be rendered.
 * @param {String} width width of the containing area in which the text is rendered
 * @returns {number} width of rendered text in pixels
 */
function getTextWidth( text, width ) {
	const canvas = getTextWidth.canvas || ( getTextWidth.canvas = document.createElement( 'canvas' ) );
	canvas.width = width;
	const context = canvas.getContext( '2d' );
	context.font = '16px arial';
	return context.measureText( text ).width;
}

/** @type {Map} stores a cache of computed row heights to prevent rerendering the canvas calculation */
const previewCache = new Map();

const rowHeightCache = f => ( notes, { noteDisplay, width } ) => ( { index } ) => {
	const note = notes[ index ];
	const { preview } = noteTitle( note );

	const key = notes[ index ].id;
	const cached = previewCache.get( key );

	if ( 'undefined' !== typeof cached ) {
		const [ cWidth, cNoteDisplay, cPreview, cHeight ] = cached;

		if ( cWidth === width && cPreview === preview && cNoteDisplay === noteDisplay ) {
			return cHeight;
		}
	}

	const height = f( width, noteDisplay, preview );

	previewCache.set( key, [ width, noteDisplay, preview, height ] );

	return height;
};

/**
 * Computes the pixel height of a row for a given preview text in the list
 *
 * @param {Number} width how wide the list renders
 * @param {string} preview preview snippet from note
 * @returns {Number} height of the row in the list
 */
const computeRowHeight = ( width, noteDisplay, preview ) => {
	const lines = Math.ceil( getTextWidth( preview, width - 30 ) / ( width - 30 ) );
	return ROW_HEIGHT_BASE + ROW_HEIGHT_LINE * Math.min( maxPreviewLines[ noteDisplay ], lines );
};

/**
 * Estimates the pixel height of a given row in the note list
 *
 * This function utilizes a cache to prevent rerendering the text into a canvas
 * @see rowHeightCache
 *
 * @function
 */
const getRowHeight = rowHeightCache( computeRowHeight );

/**
 * Renders an individual row in the note list
 *
 * @see react-virtual/list
 *
 * @param {Object[]} notes list of filtered notes
 * @param {String} noteDisplay list view style: comfy, condensed, expanded
 * @param {Number} selectedNoteId id of currently selected note
 * @param {Function} onSelectNote used to change the current note selection
 * @param {Function} onPinNote used to pin a note to the top of the list
 * @returns {Function} does the actual rendering for the List
 */
const renderNote = ( notes, { noteDisplay, selectedNoteId, onSelectNote, onPinNote } ) => ( { index, rowIndex, key, style } ) => {
	const note = notes[ 'undefined' === typeof index ? rowIndex : index ];
	const { title, preview } = noteTitle( note );
	const isPublished = ! isEmpty( note.data.publishURL );
	const showPublishIcon = isPublished && ( 'condensed' !== noteDisplay );

	const classes = classNames( 'note-list-item', {
		'note-list-item-selected': selectedNoteId === note.id,
		'note-list-item-pinned': note.pinned,
		'published-note': isPublished
	} );

	return (
		<div key={key} style={ style } className={classes}>
			<div className="note-list-item-pinner" tabIndex="0" onClick={onPinNote.bind( null, note )}></div>
			<div className="note-list-item-text theme-color-border" tabIndex="0" onClick={onSelectNote.bind( null, note.id )}>
				<div className="note-list-item-title">
					<span>{ title }</span>
					{ showPublishIcon &&
					<div className="note-list-item-published-icon"><PublishIcon /></div> }
				</div>
				{ 'condensed' !== noteDisplay && preview.trim() &&
					<div className="note-list-item-excerpt">{ preview }</div>
				}
			</div>
		</div>
	);
};

const NoteList = React.createClass( {
	propTypes: {
		notes: PropTypes.array.isRequired,
		selectedNoteId: PropTypes.any,
		onSelectNote: PropTypes.func.isRequired,
		onPinNote: PropTypes.func.isRequired,
		noteDisplay: PropTypes.string.isRequired,
		onEmptyTrash: PropTypes.any.isRequired,
		showTrash: PropTypes.bool,
	},

	componentDidMount() {
		/**
		 * Prevents rapid changes from incurring major
		 * performance hits due to row height computation
		 */
		this.recomputeHeights = debounce(
			() => this.list && this.list.recomputeRowHeights(),
			TYPING_DEBOUNCE_DELAY
		);
	},

	componentWillReceiveProps( nextProps ) {
		if (
			nextProps.noteDisplay !== this.props.noteDisplay ||
			nextProps.notes !== this.props.notes
		) {
			this.recomputeHeights();
		}
	},

	refList( r ) {
		this.list = r;
	},

	render() {
		const {
			selectedNoteId,
			onSelectNote,
			onEmptyTrash,
			noteDisplay,
			showTrash
		} = this.props;

		const listItemsClasses = classNames( 'note-list-items', noteDisplay );

		const renderNoteRow = renderNote( this.props.notes, {
			noteDisplay,
			onSelectNote,
			onPinNote: this.onPinNote,
			selectedNoteId,
		} );

		const heightGetter = getRowHeight( this.props.notes, { noteDisplay, width: 100 } );
		console.time('height');
		this.props.notes.forEach( ( note, index ) => heightGetter( { index } ) );
		console.timeEnd('height');

		return (
			<div className="note-list">
				<div className={listItemsClasses}>
					<AutoSizer>
						{ ( { height, width } ) =>
							<List
								ref={ this.refList }
								height={ height }
								noteDisplay={ noteDisplay }
								notes={ this.props.notes }
								rowCount={ this.props.notes.length }
								rowHeight={ (
									'condensed' === noteDisplay
										? ROW_HEIGHT_BASE
										: getRowHeight( this.props.notes, { noteDisplay, width } )
								) }
								rowRenderer={ renderNoteRow }
								width={ width }
							/>
						}
					</AutoSizer>
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
