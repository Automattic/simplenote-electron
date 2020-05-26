import actions from '../state/actions';
import { init, updateFilter, updateNote } from './worker';
import { filterTags } from '../tag-suggestions';

import * as A from '../state/action-types';
import * as S from '../state';
import * as T from '../types';

const emptyList = [] as T.NoteEntity[];

export const middleware: S.Middleware = (store) => {
  const {
    port1: searchProcessor,
    port2: _searchProcessor,
  } = new MessageChannel();

  const setFilteredNotes = (noteIds: Set<T.EntityId>) => {
    const {
      data,
      tags,
      ui: { searchQuery },
    } = store.getState();

    const filteredTags = filterTags(tags, searchQuery);
    const tagSuggestions = filteredTags.length > 0 ? filteredTags : emptyList;

    store.dispatch(
      actions.ui.filterNotes(
        noteIds.size > 0 ? [...noteIds.values()] : [...data.notes.keys()],
        tagSuggestions
      )
    );
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
