import { AnyAction } from 'redux';
import { filterNotes as filterAction } from './actions';
import filterNotes from '../../utils/filter-notes';

let searchTimeout: NodeJS.Timeout;

export default store => {
  const updateNotes = () =>
    store.dispatch(filterAction(filterNotes(store.getState().appState)));

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

      // on updating the search field we should delay the update
      // so we don't waste our CPU time and lose responsiveness
      case 'App.noteUpdatedRemotely':
      case 'App.search':
        clearTimeout(searchTimeout);
        if ('App.search' === action.type && !action.filter) {
          // if we just cleared out the search bar then immediately update
          updateNotes();
        } else {
          searchTimeout = setTimeout(updateNotes, 500);
        }
        break;
    }

    return result;
  };
};
