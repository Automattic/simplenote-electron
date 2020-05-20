import { filterTags } from '../tag-suggestions';
import { getTerms } from '../utils/filter-notes';

import * as A from '../state/action-types';
import * as S from '../state';
import * as T from '../types';

const emptyList = [] as unknown[];

type SearchNote = {
  content: string;
  casedContent: string;
  tags: Set<T.TagName>;
  creationDate: number;
  modificationDate: number;
  isPinned: boolean;
  isTrashed: boolean;
};

type SearchState = {
  hasSelectedFirstNote: boolean;
  notes: Map<T.EntityId, SearchNote>;
  openedTag: T.TagName | null;
  searchQuery: string;
  searchTags: Set<T.TagName>;
  searchTerms: string[];
  showTrash: boolean;
  sortType: T.SortType;
  sortReversed: boolean;
};

const toSearchNote = (note: Partial<T.Note>): SearchNote => ({
  content: note.content?.toLocaleLowerCase() ?? '',
  casedContent: note.content ?? '',
  tags: new Set(note.tags?.map((tag) => tag.toLocaleLowerCase()) ?? []),
  creationDate: note.creationDate ?? Date.now() / 1000,
  modificationDate: note.modificationDate ?? Date.now() / 1000,
  isPinned: note.systemTags?.includes('pinned') ?? false,
  isTrashed: !!note.deleted ?? false,
});

const tagsFromSearch = (query: string) => {
  const tagPattern = /(?:\btag:)([^\s,]+)/g;
  const searchTags = new Set<T.TagName>();
  let match;
  while ((match = tagPattern.exec(query)) !== null) {
    searchTags.add(match[1].toLocaleLowerCase());
  }
  return searchTags;
};

export const middleware: S.Middleware = (store) => {
  const searchState: SearchState = {
    hasSelectedFirstNote: false,
    notes: new Map(),
    openedTag: null,
    searchQuery: '',
    searchTags: new Set(),
    searchTerms: [],
    showTrash: false,
    sortType: store.getState().settings.sortType,
    sortReversed: store.getState().settings.sortReversed,
  };

  const indexAlphabetical: T.EntityId[] = [];
  const indexCreationDate: T.EntityId[] = [];
  const indexModification: T.EntityId[] = [];

  type Comparator<U> = (a: U, b: U) => number;

  const indexNote = (noteId: T.EntityId): void => {
    const compareWith = (
      compare: Comparator<SearchNote>
    ): Comparator<T.EntityId> => (a: T.EntityId, b: T.EntityId) => {
      const noteA = searchState.notes.get(a);
      const noteB = searchState.notes.get(b);

      if (!noteA || !noteB) {
        return a.localeCompare(b);
      }

      if (noteA.isPinned !== noteB.isPinned) {
        return noteA.isPinned ? -1 : 1;
      }

      const comparison = compare(noteA, noteB);

      return comparison !== 0 ? comparison : a.localeCompare(b);
    };

    const alphabetical = compareWith((a, b) =>
      a.casedContent.localeCompare(b.casedContent)
    );
    const creationDate = compareWith((a, b) => b.creationDate - a.creationDate);
    const modification = compareWith(
      (a, b) => b.modificationDate - a.modificationDate
    );

    const findSpot = (
      index: T.EntityId[],
      id: T.EntityId,
      compare: Comparator<T.EntityId>,
      start: number,
      end: number
    ): number => {
      if (start >= end) {
        return start;
      }

      const midPoint = Math.floor((start + end) / 2);
      const comparison = compare(id, index[midPoint]);

      if (comparison < 0) {
        return findSpot(index, id, compare, start, midPoint);
      }

      if (comparison > 0) {
        return findSpot(index, id, compare, midPoint + 1, end);
      }

      return midPoint;
    };

    ([
      [indexAlphabetical, alphabetical],
      [indexCreationDate, creationDate],
      [indexModification, modification],
    ] as [T.EntityId[], Comparator<T.EntityId>][]).forEach(
      ([index, compare]) => {
        const existingAt = index.indexOf(noteId);

        // remove existing entry
        if (existingAt > -1) {
          index.splice(existingAt, 1);
        }

        const nextAt = findSpot(index, noteId, compare, 0, index.length);
        index.splice(nextAt, 0, noteId);
      }
    );
  };

  const removeNoteFromIndex = (noteId: T.EntityId) => {
    ([
      indexAlphabetical,
      indexCreationDate,
      indexModification,
    ] as T.EntityId[][]).forEach((index) => {
      const at = index.indexOf(noteId);
      if (at > -1) {
        index.splice(at, 1);
      }
    });
  };

  window.indexAlphabetical = indexAlphabetical;
  window.indexCreationDate = indexCreationDate;
  window.indexModification = indexModification;
  window.searchState = searchState;

  const runSearch = (): T.EntityId[] => {
    const {
      notes,
      openedTag,
      searchTags,
      searchTerms,
      sortReversed,
      sortType,
      showTrash,
    } = searchState;
    const matches = new Set<T.EntityId>();
    const pinnedMatches = new Set<T.EntityId>();

    const sortIndex =
      sortType === 'alphabetical'
        ? indexAlphabetical
        : sortType === 'creationDate'
        ? indexCreationDate
        : indexModification;

    for (let i = 0; i < sortIndex.length; i++) {
      const noteId = sortIndex[sortReversed ? sortIndex.length - i - 1 : i];
      const note = notes.get(noteId);

      if (showTrash !== note.isTrashed) {
        continue;
      }

      let hasAllTags = true;
      for (const tagName of searchTags.values()) {
        if (!note.tags.has(tagName)) {
          hasAllTags = false;
          break;
        }
      }
      if (!hasAllTags) {
        continue;
      }

      if (openedTag && !note.tags.has(openedTag)) {
        continue;
      }

      if (
        searchTerms.length > 0 &&
        !searchTerms.every((term) => note.content.includes(term))
      ) {
        continue;
      }

      if (note.isPinned) {
        pinnedMatches.add(noteId);
      } else {
        matches.add(noteId);
      }
    }

    return [...pinnedMatches.values(), ...matches.values()];
  };

  const setFilteredNotes = (
    noteIds: T.EntityId[]
  ): { noteIds: T.EntityId[]; tagIds: T.EntityId[] } => {
    const { data } = store.getState();
    const { searchQuery } = searchState;

    const filteredTags = filterTags(data.tags[0], searchQuery);
    const tagSuggestions =
      filteredTags.length > 0 ? filteredTags : (emptyList as T.EntityId[]);

    return { noteIds, tagIds: tagSuggestions };
  };

  const withSearch = <T extends A.ActionType>(action: T): T => ({
    ...action,
    meta: {
      ...action.meta,
      searchResults: setFilteredNotes(runSearch()),
    },
  });

  const withNextNote = <T extends A.ActionType>(action: T): T => {
    const {
      ui: { filteredNotes, openedNote },
    } = store.getState();

    if (!openedNote) {
      return action;
    }

    const noteAt = filteredNotes.findIndex((noteId) => noteId === openedNote);
    const nextNoteToOpen =
      noteAt === -1
        ? filteredNotes[0] ?? null
        : filteredNotes[noteAt + 1] ?? filteredNotes[noteAt - 1] ?? null;

    return {
      ...action,
      meta: {
        ...action.meta,
        nextNoteToOpen,
      },
    };
  };

  let searchTimer: number | null = null;
  const queueSearch = () => {
    clearTimeout(searchTimer!);

    searchTimer = setTimeout(() => {
      const searchResults = setFilteredNotes(runSearch());

      store.dispatch({
        type: 'FILTER_NOTES',
        ...searchResults,
        meta: {
          searchResults,
        },
      });
    }, 30);
  };

  store.getState().data.notes.forEach((note, noteId) => {
    searchState.notes.set(noteId, toSearchNote(note));
    indexNote(noteId);
  });
  queueSearch();

  return (rawNext) => (action: A.ActionType) => {
    const state = store.getState();

    const next = (action: A.ActionType) => {
      if (
        !searchState.hasSelectedFirstNote &&
        action.meta?.searchResults?.noteIds.length > 0
      ) {
        searchState.hasSelectedFirstNote = true;
        return rawNext({
          ...action,
          meta: {
            ...action.meta,
            nextNoteToOpen: action.meta?.searchResults.noteIds[0],
          },
        });
      }

      return rawNext(action);
    };

    switch (action.type) {
      case 'CONFIRM_NEW_NOTE': {
        searchState.notes.delete(action.originalNoteId);
        searchState.notes.set(action.newNoteId, toSearchNote(action.note));
        removeNoteFromIndex(action.originalNoteId);
        indexNote(action.newNoteId);
        return next(withSearch(action));
      }

      case 'CREATE_NOTE_WITH_ID':
      case 'IMPORT_NOTE_WITH_ID':
      case 'REMOTE_NOTE_UPDATE':
        searchState.notes.set(action.noteId, toSearchNote(action.note ?? {}));
        indexNote(action.noteId);
        queueSearch();
        return next(action);

      case 'DELETE_NOTE_FOREVER':
      case 'REMOTE_NOTE_DELETE_FOREVER':
        searchState.notes.delete(action.noteId);
        removeNoteFromIndex(action.noteId);
        return next(withNextNote(withSearch(action)));

      case 'EDIT_NOTE': {
        const note = searchState.notes.get(action.noteId)!;
        if ('undefined' !== typeof action.changes.content) {
          note.content = action.changes.content.toLocaleLowerCase();
          note.casedContent = action.changes.content;
        }
        if ('undefined' !== typeof action.changes.tags) {
          note.tags = new Set(
            action.changes.tags.map((tag) => tag.toLocaleLowerCase())
          );
        }
        if ('undefined' !== typeof action.changes.creationDate) {
          note.creationDate = action.changes.creationDate * 1000;
        }
        if ('undefined' !== typeof action.changes.modificationDate) {
          note.modificationDate = action.changes.modificationDate * 1000;
        }
        if ('undefined' !== typeof action.changes.deleted) {
          note.isTrashed = !!action.changes.deleted;
        }
        if ('undefined' !== typeof action.changes.systemTags) {
          note.isPinned = action.changes.systemTags.includes('pinned');
        }
        indexNote(action.noteId);
        return next(withSearch(action));
      }

      case 'OPEN_TAG':
        searchState.openedTag = state.data.tags[0].get(action.tagId)!.name;
        return next(withSearch(action));

      case 'PIN_NOTE':
        searchState.notes.get(action.noteId)!.isPinned = action.shouldPin;
        indexNote(action.noteId);
        return next(withSearch(action));

      case 'RESTORE_NOTE':
        if (!searchState.notes.has(action.noteId)) {
          return;
        }
        searchState.notes.get(action.noteId)!.isTrashed = false;
        indexNote(action.noteId);
        return next(withNextNote(withSearch(action)));

      case 'SELECT_TRASH':
        searchState.openedTag = null;
        searchState.showTrash = true;
        return next(withSearch(action));

      case 'SHOW_ALL_NOTES':
        searchState.openedTag = null;
        searchState.showTrash = false;
        return next(withSearch(action));

      case 'SEARCH':
        searchState.searchQuery = action.searchQuery;
        searchState.searchTerms = getTerms(action.searchQuery);
        searchState.searchTags = tagsFromSearch(action.searchQuery);
        return next(withSearch(action));

      case 'setSortReversed':
        searchState.sortReversed = action.sortReversed;
        return next(withSearch(action));

      case 'setSortType':
        searchState.sortType = action.sortType;
        return next(withSearch(action));

      case 'TOGGLE_SORT_ORDER':
        searchState.sortReversed = !searchState.sortReversed;
        return next(withSearch(action));

      case 'TRASH_NOTE':
        if (!searchState.notes.has(action.noteId)) {
          return;
        }
        searchState.notes.get(action.noteId)!.isTrashed = true;
        return next(withNextNote(withSearch(action)));
    }

    return next(action);
  };
};
