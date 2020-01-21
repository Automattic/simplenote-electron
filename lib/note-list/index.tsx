/**
 * @module NoteList
 *
 * This module includes some ugly code.
 * The note list display is a significant source of
 * visual re-render lag for accounts with many notes.
 * The trade-offs in this file reflect a decision to
 * optimize heavy inner loops for performance over
 * code burden.
 *
 * Any changes to this code which could affect the
 * row height calculations should be double-checked
 * against performance regressions.
 */
import React, { Component, Fragment, createRef } from 'react';
import PropTypes from 'prop-types';
import { AutoSizer, List } from 'react-virtualized';
import PublishIcon from '../icons/feed';
import classNames from 'classnames';
import { debounce, get, isEmpty } from 'lodash';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import getNoteTitleAndPreview from './get-note-title-and-preview';
import {
  decorateWith,
  checkboxDecorator,
  makeFilterDecorator,
} from './decorators';
import TagSuggestions, { getMatchingTags } from '../tag-suggestions';

AutoSizer.displayName = 'AutoSizer';
List.displayName = 'List';

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

/**
 * Maximum delay when debouncing the row height calculation
 *
 * this is used to make sure that we don't endlessly delay
 * the row height recalculation in situations like when we
 * are constantly typing without pause. by setting this value
 * we can make sure that the updates don't happen
 * less-frequently than the number of ms set here
 *
 * @type {Number} maximum number of ms between calls when debouncing recomputeRowHeights in virtual/list
 */
const TYPING_DEBOUNCE_MAX = 1000;

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

/** @type {Number} height of a single header in list rows */
const HEADER_HEIGHT = 28;

/** @type {Number} height of a single tag result row in list rows */
const TAG_ROW_HEIGHT = 40;

/** @type {Number} height of a the empty "No Notes" div in the notes list */
const EMPTY_DIV_HEIGHT = 200;

/**
 * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
 *
 * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
 *
 * @param {String} text The text to be rendered.
 * @param {String} width width of the containing area in which the text is rendered
 * @returns {number} width of rendered text in pixels
 */
function getTextWidth(text, width) {
  const canvas =
    getTextWidth.canvas ||
    (getTextWidth.canvas = document.createElement('canvas'));
  canvas.width = width;
  const context = canvas.getContext('2d');
  context.font = '16px arial';
  return context.measureText(text).width;
}

/** @type {Map} stores a cache of computed row heights to prevent re-rendering the canvas calculation */
const previewCache = new Map();

/**
 * Caches based on note id, width, note display format, and note preview excerpt
 *
 * @param {Function} f produces the row height
 * @returns {Number} row height for note in list
 */
const rowHeightCache = f => (
  notes,
  { noteDisplay, tagResultsFound, width }
) => ({ index }) => {
  const note = notes[index];

  // handle special sections
  switch (note) {
    case 'notes-header':
      return HEADER_HEIGHT;
    case 'tag-suggestions':
      return HEADER_HEIGHT + TAG_ROW_HEIGHT * tagResultsFound;
    case 'no-notes':
      return EMPTY_DIV_HEIGHT;
  }

  const { preview } = getNoteTitleAndPreview(note);

  const key = note.id;
  const cached = previewCache.get(key);

  if ('undefined' !== typeof cached) {
    const [cWidth, cNoteDisplay, cPreview, cHeight] = cached;

    if (
      cWidth === width &&
      cNoteDisplay === noteDisplay &&
      cPreview === preview
    ) {
      return cHeight;
    }
  }

  const height = f(width, noteDisplay, preview);

  previewCache.set(key, [width, noteDisplay, preview, height]);

  return height;
};

/**
 * Computes the pixel height of a row for a given preview text in the list
 *
 * @param {Number} width how wide the list renders
 * @param {String} noteDisplay mode of list display: 'comfy', 'condensed', or 'expanded'
 * @param {String} preview preview snippet from note
 * @returns {Number} height of the row in the list
 */
const computeRowHeight = (width, noteDisplay, preview) => {
  if ('condensed' === noteDisplay) {
    return ROW_HEIGHT_BASE;
  }

  const lines = Math.ceil(getTextWidth(preview, width - 24) / (width - 24));
  return (
    ROW_HEIGHT_BASE +
    ROW_HEIGHT_LINE * Math.min(maxPreviewLines[noteDisplay], lines)
  );
};

/**
 * Estimates the pixel height of a given row in the note list
 *
 * This function utilizes a cache to prevent rerendering the text into a canvas
 * @see rowHeightCache
 *
 * @function
 */
const getRowHeight = rowHeightCache(computeRowHeight);

/**
 * Renders an individual row in the note list
 *
 * @see react-virtual/list
 *
 * @param {Object[]} notes list of filtered notes
 * @param {String} filter search filter
 * @param {String} noteDisplay list view style: comfy, condensed, expanded
 * @param {Number} selectedNoteId id of currently selected note
 * @param {Function} onSelectNote used to change the current note selection
 * @param {Function} onPinNote used to pin a note to the top of the list
 * @returns {Function} does the actual rendering for the List
 */
const renderNote = (
  notes,
  {
    filter,
    noteDisplay,
    selectedNoteId,
    onNoteOpened,
    onSelectNote,
    onPinNote,
    isSmallScreen,
  }
) => ({ index, rowIndex, key, style }) => {
  const note = notes['undefined' === typeof index ? rowIndex : index];

  // handle special sections
  switch (note) {
    case 'notes-header':
      return (
        <div key={key} style={style} className="note-list-header">
          Notes
        </div>
      );
    case 'tag-suggestions':
      return (
        <div key={key} style={style}>
          <TagSuggestions />
        </div>
      );
    case 'no-notes':
      return (
        <div key={key} style={style} className="note-list is-empty">
          <span className="note-list-placeholder">No Notes</span>
        </div>
      );
  }

  const { title, preview } = getNoteTitleAndPreview(note);
  const isPublished = !isEmpty(note.data.publishURL);

  const classes = classNames('note-list-item', {
    'note-list-item-selected': !isSmallScreen && selectedNoteId === note.id,
    'note-list-item-pinned': note.data.systemTags.includes('pinned'),
    'published-note': isPublished,
  });

  const decorators = [checkboxDecorator, makeFilterDecorator(filter)];

  const selectNote = () => {
    onSelectNote(note.id);
    onNoteOpened();
  };

  return (
    <div key={key} style={style} className={classes}>
      <div
        className="note-list-item-pinner"
        tabIndex={0}
        onClick={onPinNote.bind(null, note)}
      />
      <div
        className="note-list-item-text theme-color-border"
        tabIndex={0}
        onClick={selectNote}
      >
        <div className="note-list-item-title">
          <span>{decorateWith(decorators, title)}</span>
          {isPublished && (
            <div className="note-list-item-published-icon">
              <PublishIcon />
            </div>
          )}
        </div>
        {'condensed' !== noteDisplay && preview.trim() && (
          <div className="note-list-item-excerpt">
            {decorateWith(decorators, preview)}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Modifies the filtered notes list to insert special sections. This
 * allows us to handle tag suggestions and headers in the row renderer.
 *
 * @see renderNote
 *
 * @param {Object[]} notes list of filtered notes
 * @param {String} filter search filter
 * @param {Number} tagResultsFound number of tag matches to display
 * @returns {Object[]} modified notes list
 */
const createCompositeNoteList = (notes, filter, tagResultsFound) => {
  if (filter.length === 0 || tagResultsFound === 0) {
    return notes;
  }

  return [
    'tag-suggestions',
    'notes-header',
    ...(notes.length > 0 ? notes : ['no-notes']),
  ];
};

export class NoteList extends Component {
  static displayName = 'NoteList';

  list = createRef();

  static propTypes = {
    closeNote: PropTypes.func.isRequired,
    filter: PropTypes.string.isRequired,
    tagResultsFound: PropTypes.number.isRequired,
    isSmallScreen: PropTypes.bool.isRequired,
    notes: PropTypes.array.isRequired,
    selectedNoteId: PropTypes.any,
    onNoteOpened: PropTypes.func.isRequired,
    onSelectNote: PropTypes.func.isRequired,
    onPinNote: PropTypes.func.isRequired,
    noteDisplay: PropTypes.string.isRequired,
    onEmptyTrash: PropTypes.any.isRequired,
    showTrash: PropTypes.bool,
  };

  componentDidMount() {
    /**
     * Prevents rapid changes from incurring major
     * performance hits due to row height computation
     */
    this.recomputeHeights = debounce(
      () => this.list.current && this.list.current.recomputeRowHeights(),
      TYPING_DEBOUNCE_DELAY,
      { maxWait: TYPING_DEBOUNCE_MAX }
    );

    this.toggleShortcuts(true);
    window.addEventListener('resize', this.recomputeHeights);
  }

  componentDidUpdate(prevProps) {
    const {
      closeNote,
      filter,
      notes,
      onSelectNote,
      selectedNoteId,
    } = this.props;

    if (
      prevProps.filter !== this.props.filter ||
      prevProps.noteDisplay !== this.props.noteDisplay ||
      prevProps.notes !== notes ||
      prevProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      this.recomputeHeights();
    }

    // Deselect the currently selected note if it doesn't match the search query
    if (filter !== prevProps.filter) {
      const selectedNotePassesFilter = notes.some(
        note => note.id === selectedNoteId
      );
      if (!selectedNotePassesFilter) {
        closeNote();
      }
    }
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
    window.removeEventListener('resize', this.recomputeHeights);
  }

  handleShortcut = event => {
    const { ctrlKey, key, metaKey, shiftKey } = event;

    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && shiftKey && (key === 'ArrowUp' || key === 'k')) {
      this.props.onSelectNote(this.props.nextNote.id);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && (key === 'ArrowDown' || key === 'j')) {
      this.props.onSelectNote(this.props.prevNote.id);

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  };

  toggleShortcuts = doEnable => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const {
      filter,
      hasLoaded,
      selectedNoteId,
      onNoteOpened,
      onSelectNote,
      onEmptyTrash,
      noteDisplay,
      showTrash,
      tagResultsFound,
      notes,
      isSmallScreen,
    } = this.props;

    const listItemsClasses = classNames('note-list-items', noteDisplay);

    const renderNoteRow = renderNote(notes, {
      filter,
      noteDisplay,
      onNoteOpened,
      onSelectNote,
      onPinNote: this.onPinNote,
      selectedNoteId,
      isSmallScreen,
    });

    const isEmptyList = notes.length === 0;

    const emptyTrashButton = (
      <div className="note-list-empty-trash theme-color-border">
        <button
          type="button"
          className="button button-borderless button-danger"
          onClick={onEmptyTrash}
        >
          Empty Trash
        </button>
      </div>
    );

    return (
      <div className={classNames('note-list', { 'is-empty': isEmptyList })}>
        {isEmptyList ? (
          <span className="note-list-placeholder">
            {hasLoaded ? 'No Notes' : 'Loading Notes'}
          </span>
        ) : (
          <Fragment>
            <div className={listItemsClasses}>
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    ref={this.list}
                    estimatedRowSize={
                      ROW_HEIGHT_BASE +
                      ROW_HEIGHT_LINE * maxPreviewLines[noteDisplay]
                    }
                    height={height}
                    noteDisplay={noteDisplay}
                    notes={notes}
                    rowCount={notes.length}
                    rowHeight={getRowHeight(notes, {
                      filter,
                      noteDisplay,
                      tagResultsFound,
                      width,
                    })}
                    rowRenderer={renderNoteRow}
                    width={width}
                  />
                )}
              </AutoSizer>
            </div>
            {!!showTrash && emptyTrashButton}
          </Fragment>
        )}
      </div>
    );
  }

  onPinNote = note =>
    this.props.onPinNote(note, !note.data.systemTags.includes('pinned'));
}

const {
  closeNote,
  emptyTrash,
  loadAndSelectNote,
  pinNote,
} = appState.actionCreators;
const { recordEvent } = tracks;

const mapStateToProps = ({
  appState: state,
  ui: { filteredNotes, note },
  settings: { noteDisplay },
}) => {
  const tagResultsFound = getMatchingTags(state.tags, state.filter).length;
  const selectedNote = note;
  const selectedNoteId = selectedNote?.id;
  const selectedNoteIndex = filteredNotes.findIndex(
    ({ id }) => id === selectedNoteId
  );

  const nextNoteId = Math.max(0, selectedNoteIndex - 1);
  const prevNoteId = Math.min(filteredNotes.length - 1, selectedNoteIndex + 1);

  const nextNote = filteredNotes[nextNoteId];
  const prevNote = filteredNotes[prevNoteId];

  const compositeNoteList = createCompositeNoteList(
    filteredNotes,
    state.filter,
    tagResultsFound
  );

  /**
   * Although not used directly in the React component this value
   * is used to bust the cache when editing a note and the number
   * of lines in the preview in the notes list needs to also update.
   *
   * React virtualized hides data in the DOM in a stateful way in
   * the way it has optimized the scrolling performance. This then
   * is missed when connect() decides whether or not to redraw the
   * component. Even with `{ pure: false }` set in `connect()` it
   * misses the updates and I think that is because they come in
   * asynchronously through events and not directly
   *
   * Therefore we have to calculate the height of the note here to
   * signal to `connect()` to redraw the component. This could also
   * happen in `areStatesEqual()` (option to `connect()`) but since
   * we're already grabbing the other data here we can skip a slight
   * amount of overhead by just passing it along here.
   *
   * @type {String} preview excerpt for the current note
   */
  const selectedNotePreview =
    selectedNote && getNoteTitleAndPreview(selectedNote).preview;

  return {
    filter: state.filter,
    hasLoaded: state.notes !== null,
    nextNote,
    noteDisplay,
    notes: compositeNoteList,
    prevNote,
    selectedNotePreview,
    selectedNoteContent: get(selectedNote, 'data.content'),
    selectedNoteId,
    showTrash: state.showTrash,
    tagResultsFound,
  };
};

const mapDispatchToProps = (dispatch, { noteBucket }) => ({
  closeNote: () => dispatch(closeNote()),
  onEmptyTrash: () => dispatch(emptyTrash({ noteBucket })),
  onSelectNote: noteId => {
    if (noteId) {
      dispatch(loadAndSelectNote({ noteBucket, noteId }));
      recordEvent('list_note_opened');
    }
  },
  onPinNote: (note, pin) => dispatch(pinNote({ noteBucket, note, pin })),
});

NoteList.propTypes = {
  hasLoaded: PropTypes.bool.isRequired,
  nextNote: PropTypes.object,
  prevNote: PropTypes.object,
  selectedNoteContent: PropTypes.string,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
