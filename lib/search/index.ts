import SearchWorker from './worker';

import actions from '../state/actions';

import * as A from '../state/action-types';
import * as S from '../state';
import * as T from '../types';

const emptyList = [] as T.NoteEntity[];

export const middleware: S.Middleware = store => {
  const searchWorker = new SearchWorker();
  const {
    port1: searchProcessor,
    port2: _searchProcessor,
  } = new MessageChannel();

  searchProcessor.onmessage = event => {
    switch (event.data.action) {
      case 'filterNotes': {
        const { appState, ui } = store.getState();
        store.dispatch(
          actions.ui.filterNotes(
            appState.notes?.filter(({ id }) => event.data.noteIds.has(id)) ||
              emptyList,
            ui.previousIndex
          )
        );
        break;
      }
    }
  };

  searchWorker.postMessage('boot', [_searchProcessor]);
  let hasInitialized = false;

  return next => (action: A.ActionType) => {
    const result = next(action);

    switch (action.type) {
      case 'App.notesLoaded':
        if (!hasInitialized) {
          const {
            appState: { notes },
          } = store.getState();
          if (notes) {
            notes.forEach(note =>
              searchProcessor.postMessage({
                action: 'updateNote',
                noteId: note.id,
                data: note.data,
              })
            );
          }

          hasInitialized = true;
        }
        searchProcessor.postMessage({ action: 'filterNotes' });
        break;

      case 'REMOTE_NOTE_UPDATE':
        searchProcessor.postMessage({
          action: 'updateNote',
          noteId: action.noteId,
          data: action.data,
        });
        break;

      case 'OPEN_TAG':
        searchProcessor.postMessage({
          action: 'filterNotes',
          openedTag: action.tag.data.name,
        });
        break;

      case 'App.selectTrash':
        searchProcessor.postMessage({
          action: 'filterNotes',
          openedTag: null,
          showTrash: true,
        });
        break;

      case 'App.showAllNotes':
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
      case 'TRASH_NOTE':
      case 'App.authChanged':
      case 'App.trashNote':
        searchProcessor.postMessage({ action: 'filterNotes' });
        break;
    }

    return result;
  };
};
