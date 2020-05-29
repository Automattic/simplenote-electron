import React, { Component, Fragment, createRef } from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  ListRowRenderer,
} from 'react-virtualized';
import classNames from 'classnames';
import { connect } from 'react-redux';
import NoteCell from './note-cell';
import TagSuggestions from '../tag-suggestions';

import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  filteredNotes: T.EntityId[];
  hasLoaded: boolean;
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  noteDisplay: T.ListDisplayMode;
  openedTag: T.TagEntity | null;
  searchQuery: string;
  showNoteList: boolean;
  showTrash: boolean;
  tagResultsFound: number;
};

type DispatchProps = {
  onEmptyTrash: () => any;
  openNote: (noteId: T.EntityId) => any;
  toggleNoteList: () => any;
};

type Props = Readonly<StateProps & DispatchProps>;

type NoteListItem =
  | T.EntityId
  | 'tag-suggestions'
  | 'notes-header'
  | 'no-notes';

/**
 * Renders an individual row in the note list
 *
 * @see react-virtual/list
 *
 * @param notes list of filtered note ids
 * @returns does the actual rendering for the List
 */
const renderNote = (
  notes: NoteListItem[],
  { heightCache }: { heightCache: CellMeasurerCache }
): ListRowRenderer => ({ index, key, parent, style }) => {
  const note = notes[index];

  if ('no-notes' === note) {
    return (
      <CellMeasurer
        cache={heightCache}
        columnIndex={0}
        key="no-notes"
        parent={parent}
        rowIndex={index}
      >
        <div className="note-list is-empty" style={{ ...style, height: 200 }}>
          <span className="note-list-placeholder">No Notes</span>
        </div>
      </CellMeasurer>
    );
  }

  if ('tag-suggestions' === note || 'notes-header' === note) {
    return 'tag-suggestions' === note ? (
      <CellMeasurer
        cache={heightCache}
        columnIndex={0}
        key="tag-suggestions"
        parent={parent}
        rowIndex={index}
      >
        <TagSuggestions />
      </CellMeasurer>
    ) : (
      <CellMeasurer
        cache={heightCache}
        columnIndex={-3}
        key="notes-header"
        parent={parent}
        rowIndex={index}
      >
        <div className="note-list-header">Notes</div>
      </CellMeasurer>
    );
  }

  return (
    <CellMeasurer
      cache={heightCache}
      columnIndex={0}
      key={key}
      parent={parent}
      rowIndex={index}
    >
      <NoteCell
        invalidateHeight={() => heightCache.clear(index, 0)}
        noteId={note}
        style={style}
      />
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
  notes: T.EntityId[],
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

  state = {
    heightCache: new CellMeasurerCache({
      // row height base is 21px for the title + 18px vertical padding
      // max preview lines is 4 lines of 24px
      defaultHeight: 21 + 18 + 24 * 4,
      fixedWidth: true,
      keyMapper: (rowIndex) => {
        const { filteredNotes, searchQuery, tagResultsFound } = this.props;

        if (tagResultsFound === 0 && filteredNotes.length === 0) {
          return 'no-notes';
        }

        if (searchQuery.length === 0 || tagResultsFound === 0) {
          return filteredNotes[rowIndex];
        }

        if (rowIndex === 0) {
          return 'tag-suggestions';
        }

        if (rowIndex === 1) {
          return 'notes-header';
        }

        return filteredNotes[rowIndex - 2];
      },
    }),
    lastNoteDisplay: null,
    selectedIndex: null,
  };

  list = createRef<List>();

  static getDerivedStateFromProps = (props: Props, state) => {
    state.heightCache.clear(0);
    if (props.noteDisplay !== state.lastNoteDisplay) {
      state.heightCache.clearAll();

      return { lastNoteDisplay: props.noteDisplay };
    }

    return null;
  };

  componentDidMount() {
    this.toggleShortcuts(true);
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
  }

  handleShortcut = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }
    const { ctrlKey, code, metaKey, shiftKey } = event;
    const { isSmallScreen, filteredNotes, showNoteList } = this.props;
    const { selectedIndex } = this.state;

    const cmdOrCtrl = ctrlKey || metaKey;
    if (cmdOrCtrl && shiftKey && code === 'KeyK') {
      if (!filteredNotes.length) {
        this.setState({ selectedIndex: null });
      } else {
        const nextIndex =
          selectedIndex !== null ? Math.max(0, selectedIndex - 1) : 0;
        const nextNote = filteredNotes[nextIndex];
        this.setState({ selectedIndex: nextIndex }, () =>
          this.props.openNote(nextNote)
        );
      }

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && code === 'KeyJ') {
      if (!filteredNotes.length) {
        this.setState({ selectedIndex: null });
      } else {
        const nextIndex =
          selectedIndex !== null
            ? Math.min(filteredNotes.length - 1, selectedIndex + 1)
            : 0;
        const nextNote = filteredNotes[nextIndex];
        this.setState({ selectedIndex: nextIndex }, () =>
          this.props.openNote(nextNote)
        );
      }

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (isSmallScreen && cmdOrCtrl && shiftKey && code === 'KeyL') {
      this.props.toggleNoteList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (
      isSmallScreen &&
      showNoteList &&
      code === 'Enter' &&
      selectedIndex !== null
    ) {
      this.props.openNote(filteredNotes[selectedIndex]);

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
      filteredNotes,
      hasLoaded,
      noteDisplay,
      onEmptyTrash,
      searchQuery,
      showTrash,
      tagResultsFound,
    } = this.props;
    const { heightCache, selectedIndex } = this.state;
    console.log('render');

    const compositeNoteList = createCompositeNoteList(
      filteredNotes,
      searchQuery,
      tagResultsFound
    );

    const specialRows = compositeNoteList.length - filteredNotes.length;
    const highlightedIndex =
      selectedIndex !== null ? selectedIndex + specialRows : null;

    const renderNoteRow = renderNote(compositeNoteList, { heightCache });
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

const mapStateToProps: S.MapState<StateProps> = (state) => {
  return {
    hasLoaded: true,
    isSmallScreen: selectors.isSmallScreen(state),
    keyboardShortcuts: state.settings.keyboardShortcuts,
    noteDisplay: state.settings.noteDisplay,
    filteredNotes: state.ui.filteredNotes,
    openedTag: state.ui.openedTag,
    searchQuery: state.ui.searchQuery,
    showNoteList: state.ui.showNoteList,
    showTrash: state.ui.showTrash,
    tagResultsFound: state.ui.tagSuggestions.length,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onEmptyTrash: () => {
    throw new Error('Empty trash!');
  },
  openNote: (noteId) => dispatch(actions.ui.openNote(noteId)),
  toggleNoteList: () => dispatch(actions.ui.toggleNoteList()),
});

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
