import { AnyAction } from 'redux';
import { applySearch } from './actions';

import SearchWorker from 'worker-loader!../../utils/search-processor.worker';

import { State } from '../';
import { SearchPort } from '../../utils/search-processor.worker';

const searchWorker = new SearchWorker();

export default (store: { dispatch: Function; getState: () => State }) => {
  const {
    port1: searchProcessor,
    port2: _searchProcessor,
  } = new MessageChannel() as { port1: SearchPort; port2: MessagePort };

  // give the search processor their comm port
  searchProcessor.onmessage = event => {
    switch (event.data.action) {
      case 'applySearch': {
        const { filter, notes, tags } = event.data;

        store.dispatch(applySearch(filter, notes, tags));
      }
    }
  };
  searchWorker.postMessage('boot', [_searchProcessor]);

  const updateNotes = (delay: number) => {
    const {
      appState: { filter, notes, showTrash, tag, tags },
    } = store.getState();
    searchProcessor.postMessage({
      action: 'applySearch',
      delay,
      filter,
      notes,
      showTrash,
      tag,
      tags,
    });
  };

  return next => (action: AnyAction) => {
    const result = next(action);

    switch (action.type) {
      // on clicks re-filter "immediately"
      case 'App.authChanged':
      case 'App.deleteNoteForever':
      case 'App.notesLoaded':
      case 'App.restoreNote':
      case 'App.selectTag':
      case 'App.selectTrash':
      case 'App.showAllNotes':
      case 'App.tagsLoaded':
      case 'App.trashNote':
        updateNotes(0);
        break;

      case 'App.noteUpdatedRemotely':
        updateNotes(10);
        break;

      // on updating the search field we should delay the update
      // so we don't waste our CPU time and lose responsiveness
      // but there are some cases where we do want an immediate response
      case 'App.search':
        updateNotes(!action.filter.trim() || action.sync ? 0 : 100);
        break;
    }

    return result;
  };
};
