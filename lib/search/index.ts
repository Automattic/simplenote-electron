import actions from '../state/actions';
import { filterTags } from '../tag-suggestions';
import { getTerms } from '../utils/filter-notes';

import * as A from '../state/action-types';
import * as S from '../state';
import * as T from '../types';

const emptyList = [] as T.NoteEntity[];

type SearchNote = {
  content: string;
  tags: Set<T.TagName>;
  creationDate: number;
  modificationDate: number;
  isPinned: boolean;
  isTrashed: boolean;
};

type SearchState = {
  notes: Map<T.EntityId, SearchNote>;
  openedTag: T.TagName | null;
  searchQuery: string;
  searchTags: Set<T.TagName>;
  searchTerms: string[];
  showTrash: boolean;
  sortType: T.SortType;
  sortReversed: boolean;
};

const tagsFromSearch = (query: string) => {
  const tagPattern = /(?:\btag:)([^\s,]+)/g;
  const searchTags = new Set<T.TagName>();
  let match;
  while ((match = tagPattern.exec(query)) !== null) {
    searchTags.add(match[1].toLocaleLowerCase());
  }
  return searchTags;
};

export const compareNotes = (
  notes: Map<T.EntityId, SearchNote>,
  sortType: T.SortType,
  sortReversed: boolean
) => (aId: T.EntityId, bId: T.EntityId): number => {
  const reverser = sortReversed ? -1 : 1;

  const a = notes.get(aId)!;
  const b = notes.get(bId)!;

  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }

  switch (sortType) {
    case 'alphabetical': {
      const lexicalCompare = a.content.localeCompare(b.content);

      return (
        reverser *
        (lexicalCompare === 0 ? aId.localeCompare(bId) : lexicalCompare)
      );
    }

    case 'modificationDate': {
      const dateCompare = b.modificationDate - a.modificationDate;

      return (
        reverser * (dateCompare === 0 ? aId.localeCompare(bId) : dateCompare)
      );
    }

    case 'creationDate': {
      const dateCompare = b.creationDate - a.modificationDate;

      return (
        reverser * (dateCompare === 0 ? aId.localeCompare(bId) : dateCompare)
      );
    }
  }
};

export const middleware: S.Middleware = (store) => {
  const searchState: SearchState = {
    notes: new Map(),
    openedTag: null,
    searchQuery: '',
    searchTags: new Set(),
    searchTerms: [],
    showTrash: false,
    sortType: store.getState().settings.sortType,
    sortReversed: store.getState().settings.sortReversed,
  };

  window.searchState = searchState;

  const runSearch = (): Set<T.EntityId> => {
    const {
      notes,
      openedTag,
      searchTags,
      searchTerms,
      showTrash,
    } = searchState;
    const matches = new Set<T.EntityId>();

    for (const [noteId, note] of notes.entries()) {
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

      matches.add(noteId);
    }

    return matches;
  };

  const setFilteredNotes = (noteIds: Set<T.EntityId>) => {
    const { data } = store.getState();
    const { searchQuery, sortReversed, sortType } = searchState;

    const filteredTags = filterTags(data.tags[0], searchQuery);
    const tagSuggestions = filteredTags.length > 0 ? filteredTags : emptyList;

    const sortedNoteIds = [...noteIds.values()].sort(
      compareNotes(searchState.notes, sortType, sortReversed)
    );

    return { noteIds: [...sortedNoteIds], tagIds: tagSuggestions };
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

  return (next) => (action: A.ActionType) => {
    const state = store.getState();

    switch (action.type) {
      case 'CREATE_NOTE_WITH_ID':
      case 'IMPORT_NOTE_WITH_ID':
        searchState.notes.set(action.noteId, {
          content: action.note?.content?.toLocaleLowerCase() ?? '',
          tags: new Set(
            action.note?.tags?.map((tag) => tag.toLocaleLowerCase()) ?? []
          ),
          creationDate: action.note?.creationDate ?? Date.now() / 1000,
          modificationDate: action.note?.creationDate ?? Date.now() / 1000,
          isPinned: action.note?.systemTags?.includes('pinned') ?? false,
          isTrashed: !!action.note?.deleted ?? false,
        });
        return next(withSearch(action));

      case 'DELETE_NOTE_FOREVER':
        searchState.notes.delete(action.noteId);
        return next(withNextNote(withSearch(action)));

      case 'EDIT_NOTE': {
        const note = searchState.notes.get(action.noteId)!;
        if ('undefined' !== typeof action.changes.content) {
          note.content = action.changes.content.toLocaleLowerCase();
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
        return next(withSearch(action));
      }

      case 'OPEN_TAG':
        searchState.openedTag = state.data.tags[0].get(action.tagId)!.name;
        return next(withSearch(action));

      case 'PIN_NOTE':
        searchState.notes.get(action.noteId)!.isPinned = action.shouldPin;
        return next(withSearch(action));

      case 'RESTORE_NOTE':
        if (!searchState.notes.has(action.noteId)) {
          return;
        }
        searchState.notes.get(action.noteId)!.isTrashed = false;
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
