import React, { Component, Fragment, createRef } from 'react';
import PropTypes from 'prop-types';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  ListRowRenderer,
} from 'react-virtualized';
import PublishIcon from '../icons/feed';
import classNames from 'classnames';
import { get } from 'lodash';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import getNoteTitleAndPreview from './get-note-title-and-preview';
import {
  decorateWith,
  checkboxDecorator,
  makeFilterDecorator,
} from './decorators';
import TagSuggestions from '../tag-suggestions';

import { State } from '../state';
import * as T from '../types';

export type NoteListItem =
  | T.NoteEntity
  | 'tag-suggestions'
  | 'notes-header'
  | 'no-notes';

AutoSizer.displayName = 'AutoSizer';
List.displayName = 'List';

const heightCache = new CellMeasurerCache({
  // row height base is 21px for the title + 18px vertical padding
  // max preview lines is 4 lines of 24px
  defaultHeight: 21 + 18 + 24 * 4,
  fixedWidth: true,
});

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
): ListRowRenderer => ({ index, key, parent, style }) => {
  const note = notes[index];

  if (
    'tag-suggestions' === note ||
    'notes-header' === note ||
    'no-notes' === note
  ) {
    return (
      <CellMeasurer
        cache={heightCache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {'tag-suggestions' === note ? (
          <TagSuggestions />
        ) : 'notes-header' === note ? (
          <div className="note-list-header">Notes</div>
        ) : (
          <div className="note-list is-empty">
            <span className="note-list-placeholder">No Notes</span>
          </div>
        )}
      </CellMeasurer>
    );
  }

  const { title, preview } = getNoteTitleAndPreview(note);
  const isPinned = note.data.systemTags.includes('pinned');
  const isPublished = note.data.publishURL && note.data.publishURL.length > 0;

  const classes = classNames('note-list-item', {
    'note-list-item-selected': !isSmallScreen && selectedNoteId === note.id,
    'note-list-item-pinned': isPinned,
    'published-note': isPublished,
  });

  const decorators = [checkboxDecorator, makeFilterDecorator(filter)];

  const selectNote = () => {
    onSelectNote(note.id);
    onNoteOpened();
  };

  return (
    <CellMeasurer
      cache={heightCache}
      columnIndex={0}
      key={key}
      parent={parent}
      rowIndex={index}
    >
      <div style={style} className={classes}>
        <div
          className="note-list-item-pinner"
          tabIndex={0}
          onClick={() => onPinNote(note, !isPinned)}
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
    </CellMeasurer>
  );
};

export class NoteList extends Component {
  static displayName = 'NoteList';

  list = createRef<List>();

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
    this.toggleShortcuts(true);
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.noteDisplay !== this.props.noteDisplay ||
      nextProps.notes !== this.props.notes ||
      nextProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      heightCache.clearAll();
    }
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
      prevProps.noteDisplay !== this.props.noteDisplay ||
      prevProps.notes !== this.props.notes ||
      prevProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      heightCache.clearAll();
    }

    // Ensure that the note selected here is also selected in the editor
    if (selectedNoteId !== prevProps.selectedNoteId) {
      onSelectNote(selectedNoteId);
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
      onPinNote,
      noteDisplay,
      showTrash,
      notes,
      isSmallScreen,
    } = this.props;

    const renderNoteRow = renderNote(notes, {
      filter,
      noteDisplay,
      onNoteOpened,
      onSelectNote,
      onPinNote,
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
            <div className={`note-list-items ${noteDisplay}`}>
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    ref={this.list}
                    estimatedRowSize={24 + 18 + 21 * 4}
                    height={height}
                    noteDisplay={noteDisplay}
                    notes={notes}
                    rowCount={notes.length}
                    rowHeight={heightCache.rowHeight}
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
  ui: { filteredNotes, noteListItems },
  settings: { noteDisplay },
}: State) => {
  const noteIndex = Math.max(state.previousIndex, 0);
  const selectedNote = state.note ? state.note : filteredNotes[noteIndex];
  const selectedNoteId = get(selectedNote, 'id', state.selectedNoteId);
  const selectedNoteIndex = filteredNotes.findIndex(
    ({ id }) => id === selectedNoteId
  );

  const nextNoteId = Math.max(0, selectedNoteIndex - 1);
  const prevNoteId = Math.min(filteredNotes.length - 1, selectedNoteIndex + 1);

  const nextNote = filteredNotes[nextNoteId];
  const prevNote = filteredNotes[prevNoteId];

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
    notes: noteListItems,
    prevNote,
    selectedNotePreview,
    selectedNoteContent: get(selectedNote, 'data.content'),
    selectedNoteId,
    showTrash: state.showTrash,
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
