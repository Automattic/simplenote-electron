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

import NoNotes from './no-notes';
import NoteCell from './note-cell';
import TagSuggestions from '../tag-suggestions';

import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  collection: T.Collection;
  filteredNotes: T.EntityId[];
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  noteDisplay: T.ListDisplayMode;
  openedNote: T.EntityId | null;
  openedTag: T.TagName | null;
  searchQuery: string;
  showNoteList: boolean;
  showTrash: boolean;
  tagResultsFound: number;
  windowWidth: number;
};

type DispatchProps = {
  onEmptyTrash: () => any;
  openNote: () => any;
  selectNoteAbove: () => any;
  selectNoteBelow: () => any;
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
          <span className="note-list-placeholder theme-color-fg">No Notes</span>
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
        <TagSuggestions style={{ ...style }} />
      </CellMeasurer>
    ) : (
      <CellMeasurer
        cache={heightCache}
        columnIndex={0}
        key="notes-header"
        parent={parent}
        rowIndex={index}
      >
        <div className="note-list-header" style={{ ...style }}>
          Notes
        </div>
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

const sidebarTitle = (
  collection: T.Collection,
  openedTag: T.TagName | null
) => {
  switch (collection.type) {
    case 'tag':
      return openedTag;
    case 'trash':
      return 'Trash';
    case 'untagged':
      return 'Untagged Notes';
    default:
      return 'All Notes';
  }
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
    windowWidth: null,
  };

  list = createRef<List>();

  static getDerivedStateFromProps = (props: Props, state) => {
    state.heightCache.clear(0);
    state.heightCache.clear(1);
    state.heightCache.clear(2);
    if (
      props.noteDisplay !== state.lastNoteDisplay ||
      props.windowWidth !== state.windowWidth
    ) {
      state.heightCache.clearAll();

      return {
        lastNoteDisplay: props.noteDisplay,
        windowWidth: props.windowWidth,
      };
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
    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();
    const { isSmallScreen, showNoteList } = this.props;

    const cmdOrCtrl = ctrlKey || metaKey;
    if (cmdOrCtrl && shiftKey && key === 'k') {
      this.props.selectNoteAbove();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && key === 'j') {
      this.props.selectNoteBelow();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (isSmallScreen && cmdOrCtrl && shiftKey && key === 'l') {
      this.props.toggleNoteList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (isSmallScreen && showNoteList && key === 'Enter') {
      this.props.openNote();

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
      collection,
      filteredNotes,
      noteDisplay,
      onEmptyTrash,
      openedNote,
      openedTag,
      searchQuery,
      showTrash,
      tagResultsFound,
    } = this.props;
    const { heightCache } = this.state;

    const compositeNoteList = createCompositeNoteList(
      filteredNotes,
      searchQuery,
      tagResultsFound
    );

    const selectedIndex = compositeNoteList.findIndex(
      (item) => item === openedNote
    );

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
          <NoNotes></NoNotes>
        ) : (
          <Fragment>
            <div className={`note-list-items ${noteDisplay}`}>
              <AutoSizer>
                {({ height, width }) => (
                  <List
                    // Ideally aria-label is changed to aria-labelledby to
                    // reference the existing #notes-title element instead of
                    // computing the label, but is not currently possible due to
                    // a limitation with react-virtualized. https://git.io/JqLvR
                    aria-label={sidebarTitle(collection, openedTag)}
                    ref={this.list}
                    estimatedRowSize={24 + 18 + 21 * 4}
                    height={height}
                    noteDisplay={noteDisplay}
                    notes={compositeNoteList}
                    rowCount={compositeNoteList.length}
                    rowHeight={heightCache.rowHeight}
                    rowRenderer={renderNoteRow}
                    scrollToIndex={selectedIndex}
                    tabIndex={null}
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
    collection: state.ui.collection,
    isSmallScreen: selectors.isSmallScreen(state),
    keyboardShortcuts: state.settings.keyboardShortcuts,
    noteDisplay: state.settings.noteDisplay,
    filteredNotes: state.ui.filteredNotes,
    openedNote: state.ui.openedNote,
    openedTag: selectors.openedTag(state),
    searchQuery: state.ui.searchQuery,
    showNoteList: state.ui.showNoteList,
    showTrash: selectors.showTrash(state),
    tagResultsFound: state.ui.tagSuggestions.length,
    windowWidth: state.browser.windowWidth,
  };
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  onEmptyTrash: actions.ui.emptyTrash,
  openNote: actions.ui.openNote,
  selectNoteAbove: actions.ui.selectNoteAbove,
  selectNoteBelow: actions.ui.selectNoteBelow,
  toggleNoteList: actions.ui.toggleNoteList,
};

export default connect(mapStateToProps, mapDispatchToProps)(NoteList);
