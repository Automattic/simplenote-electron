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
import analytics from '../analytics';
import getNoteTitleAndPreview from './get-note-title-and-preview';
import {
  decorateWith,
  checkboxDecorator,
  makeFilterDecorator,
} from './decorators';
import TagSuggestions from '../tag-suggestions';

import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';
import { getTerms } from '../utils/filter-notes';

type OwnProps = {
  isSmallScreen: boolean;
  noteBucket: T.Bucket<T.Note>;
};

type StateProps = {
  hasLoaded: boolean;
  noteDisplay: T.ListDisplayMode;
  notes: T.NoteEntity[];
  searchQuery: string;
  selectedNoteContent: string;
  selectedNotePreview: { title: string; preview: string };
  selectedNoteId?: T.EntityId;
  showTrash: boolean;
  tagResultsFound: number;
};

type DispatchProps = {
  closeNote: () => any;
  onEmptyTrash: () => any;
  onSelectNote: (noteId: T.EntityId | null) => any;
  onPinNote: (note: T.NoteEntity, shouldPin: boolean) => any;
};

type Props = OwnProps & StateProps & DispatchProps;

type NoteListItem =
  | T.NoteEntity
  | 'tag-suggestions'
  | 'notes-header'
  | 'no-notes';

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
 * @param notes list of filtered notes
 * @param searchQuery search searchQuery
 * @param noteDisplay list view style: comfy, condensed, expanded
 * @param selectedNoteId id of currently selected note
 * @param onSelectNote used to change the current note selection
 * @param onPinNote used to pin a note to the top of the list
 * @param isSmallScreen whether we're in a narrow view
 * @returns does the actual rendering for the List
 */
const renderNote = (
  notes: NoteListItem[],
  {
    searchQuery,
    noteDisplay,
    selectedNoteId,
    onSelectNote,
    onPinNote,
    isSmallScreen,
  }: {
    searchQuery: string;
    noteDisplay: T.ListDisplayMode;
    selectedNoteId?: T.EntityId;
    onSelectNote: DispatchProps['onSelectNote'];
    onPinNote: DispatchProps['onPinNote'];
    isSmallScreen: boolean;
  }
): ListRowRenderer => ({ index, key, parent, style }) => {
  const note = notes[index];

  if ('no-notes' === note) {
    return (
      <div className="note-list is-empty" style={{ ...style, height: 200 }}>
        <span className="note-list-placeholder">No Notes</span>
      </div>
    );
  }

  if ('tag-suggestions' === note || 'notes-header' === note) {
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
        ) : (
          <div className="note-list-header">Notes</div>
        )}
      </CellMeasurer>
    );
  }

  const { title, preview } = getNoteTitleAndPreview(note);
  const isPinned = note.data.systemTags.includes('pinned');
  const isPublished = !!note.data.publishURL;
  const classes = classNames('note-list-item', {
    'note-list-item-selected': !isSmallScreen && selectedNoteId === note.id,
    'note-list-item-pinned': isPinned,
    'published-note': isPublished,
  });

  const terms = getTerms(searchQuery).map(makeFilterDecorator);
  const decorators = [checkboxDecorator, ...terms];

  const selectNote = () => onSelectNote(note.id);

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

/**
 * Modifies the filtered notes list to insert special sections. This
 * allows us to handle tag suggestions and headers in the row renderer.
 *
 * @see renderNote
 *
 * @param notes list of filtered notes
 * @param searchQuery search filter
 * @param tagResultsFound number of tag matches to display
 * @returns modified notes list
 */
const createCompositeNoteList = (
  notes: T.NoteEntity[],
  searchQuery: string,
  tagResultsFound: number
): NoteListItem[] => {
  if (searchQuery.length === 0 || tagResultsFound === 0) {
    return notes;
  }

  return [
    'tag-suggestions',
    'notes-header',
    ...(notes.length > 0 ? notes : ['no-notes' as NoteListItem]),
  ];
};

export class NoteList extends Component<Props> {
  static displayName = 'NoteList';

  list = createRef<List>();

  static propTypes = {
    isSmallScreen: PropTypes.bool.isRequired,
    noteDisplay: PropTypes.string.isRequired,
    notes: PropTypes.array.isRequired,
    onEmptyTrash: PropTypes.any.isRequired,
    onSelectNote: PropTypes.func.isRequired,
    onPinNote: PropTypes.func.isRequired,
    showTrash: PropTypes.bool,
  };

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  UNSAFE_componentWillReceiveProps(nextProps: Readonly<Props>): void {
    if (
      nextProps.noteDisplay !== this.props.noteDisplay ||
      nextProps.notes !== this.props.notes ||
      nextProps.tagResultsFound !== this.props.tagResultsFound ||
      nextProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      heightCache.clearAll();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>) {
    if (
      prevProps.noteDisplay !== this.props.noteDisplay ||
      prevProps.notes !== this.props.notes ||
      prevProps.tagResultsFound !== this.props.tagResultsFound ||
      prevProps.selectedNoteContent !== this.props.selectedNoteContent
    ) {
      heightCache.clearAll();
    }
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  handleShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, code, metaKey, shiftKey } = event;
    const { notes, selectedNoteId } = this.props;

    const selectedIndex =
      selectedNoteId && notes
        ? notes.findIndex(({ id }) => id === selectedNoteId)
        : -1;

    const cmdOrCtrl = ctrlKey || metaKey;
    if (cmdOrCtrl && shiftKey && code === 'KeyK') {
      if (selectedIndex > 0) {
        this.props.onSelectNote(notes[selectedIndex - 1].id);
      }

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && code === 'KeyJ') {
      if (selectedIndex < notes.length - 1) {
        this.props.onSelectNote(notes[selectedIndex + 1].id);
      }

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    return true;
  };

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const {
      hasLoaded,
      isSmallScreen,
      noteDisplay,
      notes,
      onSelectNote,
      onEmptyTrash,
      onPinNote,
      searchQuery,
      selectedNoteId,
      showTrash,
      tagResultsFound,
    } = this.props;

    const compositeNoteList = createCompositeNoteList(
      notes,
      searchQuery,
      tagResultsFound
    );

    const renderNoteRow = renderNote(compositeNoteList, {
      searchQuery,
      noteDisplay,
      onSelectNote,
      onPinNote,
      selectedNoteId,
      isSmallScreen,
    });

    const isEmptyList = compositeNoteList.length === 0;

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
                    notes={compositeNoteList}
                    rowCount={compositeNoteList.length}
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

const { emptyTrash, loadAndSelectNote } = appState.actionCreators;

const mapStateToProps: S.MapState<StateProps> = ({
  appState: state,
  ui: { filteredNotes, note, searchQuery, showTrash, tagSuggestions },
  settings: { noteDisplay },
}) => {
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
  const selectedNotePreview = note && getNoteTitleAndPreview(note).preview;

  return {
    hasLoaded: state.notes !== null,
    noteDisplay,
    notes: filteredNotes,
    searchQuery,
    selectedNotePreview,
    selectedNoteContent: get(note, 'data.content'),
    selectedNoteId: note?.id,
    showTrash,
    tagResultsFound: tagSuggestions.length,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps, OwnProps> = (
  dispatch,
  { noteBucket }
) => ({
  closeNote: () => dispatch(actions.ui.closeNote()),
  onEmptyTrash: () => dispatch(emptyTrash({ noteBucket })),
  onSelectNote: noteId => {
    if (noteId) {
      dispatch(loadAndSelectNote({ noteBucket, noteId }));
      analytics.tracks.recordEvent('list_note_opened');
    }
  },
  onPinNote: (note, shouldPin) => dispatch(actions.ui.pinNote(note, shouldPin)),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
