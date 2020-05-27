import actions from '../state/actions';
import { init, updateFilter, updateNote } from './worker';
import { filterTags } from '../tag-suggestions';

import * as A from '../state/action-types';
import * as S from '../state';
import * as T from '../types';

const emptyList = [] as T.NoteEntity[];

export const compareNotes = (
  notes: Map<T.EntityId, T.Note>,
  sortType: T.SortType,
  sortReversed: boolean
) => (aId: T.EntityId, bId: T.EntityId): number => {
  const reverser = sortReversed ? -1 : 1;

  const a = notes.get(aId)!;
  const b = notes.get(bId)!;
  const aIsPinned = a.systemTags.includes('pinned');
  const bIsPinned = b.systemTags.includes('pinned');

  if (aIsPinned !== bIsPinned) {
    return aIsPinned ? -1 : 1;
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
  const {
    port1: searchProcessor,
    port2: _searchProcessor,
  } = new MessageChannel();

  const setFilteredNotes = (noteIds: Set<T.EntityId>) => {
    const {
      data,
      settings: { sortType, sortReversed },
      tags,
      ui: { searchQuery },
    } = store.getState();

    const filteredTags = filterTags(tags, searchQuery);
    const tagSuggestions = filteredTags.length > 0 ? filteredTags : emptyList;

    const unsortedNoteIds =
      noteIds.size > 0 ? noteIds.values() : data.notes.keys();
    const sortedNoteIds = [...unsortedNoteIds].sort(
      compareNotes(data.notes, sortType, sortReversed)
    );

    store.dispatch(actions.ui.filterNotes(sortedNoteIds, tagSuggestions));
  };

  searchProcessor.onmessage = (event) => {
    switch (event.data.action) {
      case 'filterNotes': {
        setFilteredNotes(event.data.noteIds);
        break;
      }
    }
  };

  init(_searchProcessor);

  return (next) => (action: A.ActionType) => {
    const prevState = store.getState();
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'CREATE_NOTE_WITH_ID':
      case 'EDIT_NOTE':
      case 'IMPORT_NOTE_WITH_ID':
        updateNote(action.noteId, nextState.data.notes.get(action.noteId));
        searchProcessor.postMessage({
          action: 'filterNotes',
          searchQuery: '',
        });
        break;

      case 'OPEN_TAG':
        searchProcessor.postMessage({
          action: 'filterNotes',
          openedTag: action.tag.data.name,
          showTrash: false,
        });
        break;

      case 'SELECT_TRASH':
        searchProcessor.postMessage({
          action: 'filterNotes',
          openedTag: null,
          showTrash: true,
        });
        break;

      case 'SHOW_ALL_NOTES':
        searchProcessor.postMessage({
          action: 'filterNotes',
          openedTag: null,
          showTrash: false,
        });
        break;

      case 'SEARCH':
        searchProcessor.postMessage({
          action: 'filterNotes',
          searchQuery: action.searchQuery,
        });
        break;

      case 'DELETE_NOTE_FOREVER':
      case 'RESTORE_NOTE':
        updateNote(prevState.ui.note.id, {
          ...prevState.ui.note.data,
          deleted: false,
        });
        setFilteredNotes(updateFilter('fullSearch'));
        break;

      case 'setSortReversed':
      case 'setSortType':
      case 'TOGGLE_SORT_ORDER':
        setFilteredNotes(updateFilter('fullSearch'));
        break;

      case 'TRASH_NOTE':
        updateNote(prevState.ui.note.id, {
          ...prevState.ui.note.data,
          deleted: true,
        });
        setFilteredNotes(updateFilter('fullSearch'));
        break;
    }

    return result;
  };
};
