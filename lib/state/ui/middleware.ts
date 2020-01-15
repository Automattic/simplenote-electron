import { AnyAction } from 'redux';
import { applySearch } from './actions';
import filterNotes from '../../utils/filter-notes';
import { filterTags } from '../../tag-suggestions';

import { State } from '../';

let searchTimeout: NodeJS.Timeout;

export default store => {
  const updateNotes = () => {
    const { appState } = store.getState() as State;
    const { filter, tags } = appState;

    const filteredNotes = filterNotes(appState);
    const filteredTags = filterTags(filter, filteredNotes, tags);

    store.dispatch(applySearch(filter, filteredNotes, filteredTags));
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
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateNotes, 50);
        break;

      case 'App.noteUpdatedRemotely':
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateNotes, 500);
        break;

      // on updating the search field we should delay the update
      // so we don't waste our CPU time and lose responsiveness
      // but there are some cases where we do want an immediate response
      case 'App.search':
        clearTimeout(searchTimeout);
        if (!action.filter || action.sync) {
          updateNotes();
        } else {
          searchTimeout = setTimeout(updateNotes, 500);
        }
        break;
    }

    return result;
  };
};
