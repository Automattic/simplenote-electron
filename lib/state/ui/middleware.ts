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
      case 'App.authChanged':
      case 'App.deleteNoteForever':
      case 'App.notesLoaded':
      case 'App.restoreNote':
      case 'App.showAllNotes':
      case 'App.selectTag':
      case 'App.selectTrash':
      case 'App.tagsLoaded':
      case 'App.trashNote':
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateNotes, 50);
        break;

      case 'App.noteUpdatedRemotely':
      case 'App.search':
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateNotes, 500);
        break;
    }

    return result;
  };
};
