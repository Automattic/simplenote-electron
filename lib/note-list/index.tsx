import React, { Component, Fragment, createRef } from 'react';
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
  openedTag: T.TagEntity | null;
  searchQuery: string;
  selectedNote: T.NoteEntity | null;
  selectedNoteContent: string;
  selectedNotePreview: { title: string; preview: string };
  showNoteList: boolean;
  showTrash: boolean;
  tagResultsFound: number;
};

type DispatchProps = {
  closeNote: () => any;
  onEmptyTrash: () => any;
  onSelectNote: (note: T.NoteEntity | null) => any;
  onPinNote: (note: T.NoteEntity, shouldPin: boolean) => any;
  openNote: (note: T.NoteEntity) => any;
  toggleNoteList: () => any;
};

type Props = Readonly<OwnProps & StateProps & DispatchProps>;

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
 * @param openNote used to select a note and open it in the editor
 * @param selectedNoteId id of currently selected note
 * @param onPinNote used to pin a note to the top of the list
 * @returns does the actual rendering for the List
 */
const renderNote = (
  notes: NoteListItem[],
  {
    searchQuery,
    noteDisplay,
    highlightedIndex,
    onPinNote,
    openNote,
  }: {
    searchQuery: string;
    noteDisplay: T.ListDisplayMode;
    highlightedIndex: number;
    onPinNote: DispatchProps['onPinNote'];
    openNote: DispatchProps['openNote'];
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
    'note-list-item-selected': highlightedIndex === index,
    'note-list-item-pinned': isPinned,
    'published-note': isPublished,
  });

  const terms = getTerms(searchQuery).map(makeFilterDecorator);
  const decorators = [checkboxDecorator, ...terms];

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
          onClick={() => openNote(note)}
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

  state = { selectedIndex: null };

  list = createRef<List>();

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  UNSAFE_componentWillReceiveProps(nextProps: Props): void {
    const {
      notes,
      noteDisplay,
      openedTag,
      selectedNote,
      selectedNoteContent,
      showNoteList,
      showTrash,
      tagResultsFound,
    } = nextProps;
    const { selectedIndex } = this.state;

    if (
      noteDisplay !== this.props.noteDisplay ||
      notes !== this.props.notes ||
      tagResultsFound !== this.props.tagResultsFound ||
      selectedNoteContent !== this.props.selectedNoteContent ||
      showNoteList !== this.props.showNoteList
    ) {
      heightCache.clearAll();
    }

    // jump to top of note list
    if (
      openedTag !== this.props.openedTag ||
      showTrash !== this.props.showTrash
    ) {
      const hasNotes = notes.length > 0;
      this.setState({ selectedIndex: hasNotes ? 0 : null });
      this.props.onSelectNote(hasNotes ? notes[0] : null);
      return;
    }

    if (notes.length === 0 && selectedNote) {
      // unselect active note if it doesn't match search
      this.props.closeNote();
      this.setState({ selectedIndex: null });
    }

    // nothing has changed, so don't change anything
    if (
      selectedIndex &&
      selectedNote &&
      notes[selectedIndex]?.id === selectedNote.id &&
      showTrash === this.props.showTrash &&
      openedTag === this.props.openedTag
    ) {
      return;
    }

    const nextIndex = this.getHighlightedIndex(nextProps);

    if (null === nextIndex) {
      return this.setState({ selectedIndex: null });
    }

    if (
      notes.length &&
      (!selectedNote || selectedNote.id !== notes[nextIndex]?.id)
    ) {
      // select the note that should be selected, if it isn't already
      this.props.onSelectNote(
        notes[Math.max(0, Math.min(notes.length - 1, nextIndex))]
      );
    }

    this.setState({ selectedIndex: nextIndex });
  }

  componentDidUpdate(prevProps: Props) {
    if (
      prevProps.noteDisplay !== this.props.noteDisplay ||
      prevProps.notes !== this.props.notes ||
      prevProps.tagResultsFound !== this.props.tagResultsFound ||
      prevProps.selectedNoteContent !== this.props.selectedNoteContent ||
      prevProps.showNoteList !== this.props.showNoteList
    ) {
      heightCache.clearAll();
    }
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  handleShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, code, metaKey, shiftKey } = event;
    const { isSmallScreen, notes, showNoteList } = this.props;
    const { selectedIndex: index } = this.state;

    const highlightedIndex = this.getHighlightedIndex(this.props);

    const cmdOrCtrl = ctrlKey || metaKey;
    if (cmdOrCtrl && shiftKey && code === 'KeyK') {
      if (-1 === highlightedIndex || index < 0 || !notes[index - 1]?.id) {
        return false;
      }

      this.props.onSelectNote(notes[index - 1]);
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && code === 'KeyJ') {
      if (
        -1 === highlightedIndex ||
        index >= notes.length ||
        !notes[index + 1]?.id
      ) {
        return false;
      }

      this.props.onSelectNote(notes[index + 1]);
      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (isSmallScreen && code === 'KeyL') {
      this.props.toggleNoteList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (
      isSmallScreen &&
      showNoteList &&
      code === 'Enter' &&
      highlightedIndex !== null
    ) {
      this.props.openNote(notes[highlightedIndex]);

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

  getHighlightedIndex = (props: Props) => {
    const { notes, selectedNote } = props;
    const { selectedIndex: index } = this.state;

    // Cases:
    //   - the notes list is empty
    //   - nothing has been selected -> select the first item if it exists
    //   - the selected note matches the index -> use the index
    //   - selected note is in the list -> use the index where it's found
    //   - selected note isn't in the list -> previous index?

    if (notes.length === 0) {
      return null;
    }

    if (!selectedNote && !index) {
      const firstNote = notes.findIndex(item => item?.id);

      return firstNote > -1 ? firstNote : null;
    }

    if (selectedNote && selectedNote.id === notes[index]?.id) {
      return index;
    }

    const noteAt = notes.findIndex(item => item?.id === selectedNote?.id);

    if (selectedNote && noteAt > -1) {
      return noteAt;
    }

    if (selectedNote) {
      return Math.min(index, notes.length - 1); // different note, same index
    }

    // we have no selected note here, but we do have a previous index
    return index;
  };

  render() {
    const {
      hasLoaded,
      noteDisplay,
      notes,
      openNote,
      onEmptyTrash,
      onPinNote,
      searchQuery,
      showTrash,
      tagResultsFound,
    } = this.props;
    const { selectedIndex } = this.state;

    const compositeNoteList = createCompositeNoteList(
      notes,
      searchQuery,
      tagResultsFound
    );

    const specialRows = compositeNoteList.length - notes.length;
    const highlightedIndex =
      selectedIndex !== null ? selectedIndex + specialRows : null;

    const renderNoteRow = renderNote(compositeNoteList, {
      searchQuery,
      highlightedIndex,
      noteDisplay,
      onPinNote,
      openNote,
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
                    scrollToIndex={highlightedIndex}
                    width={width}
                  />
                )}
              </AutoSizer>
            </div>
            {showTrash && emptyTrashButton}
          </Fragment>
        )}
      </div>
    );
  }
}

const { emptyTrash } = appState.actionCreators;

const mapStateToProps: S.MapState<StateProps> = ({
  appState: state,
  ui: {
    filteredNotes,
    note,
    openedTag,
    searchQuery,
    showNoteList,
    showTrash,
    tagSuggestions,
  },
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
    openedTag,
    searchQuery,
    selectedNote: note,
    selectedNotePreview,
    selectedNoteContent: get(note, 'data.content'),
    showNoteList,
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
  onSelectNote: (note: T.NoteEntity | null) => {
    dispatch(actions.ui.selectNote(note));
    analytics.tracks.recordEvent('list_note_opened');
  },
  onPinNote: (note, shouldPin) => dispatch(actions.ui.pinNote(note, shouldPin)),
  openNote: (note: T.NoteEntity) => dispatch(actions.ui.openNote(note)),
  toggleNoteList: () => dispatch(actions.ui.toggleNoteList()),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
