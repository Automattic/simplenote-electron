import actions from '../actions';
import { SEARCH_NOTES } from '../action-types';
import filterNotes from '../../utils/filter-notes';

const searchRelatedActions = new Set([
  'App.notesLoaded',
  'App.selectTag',
  'App.showAllNotes',
  SEARCH_NOTES,
]);

let searchHandle;
export const runSearches = store => next => action => {
  const nextAction = next(action);

  if (!searchRelatedActions.has(action.type)) {
    console.log(action);
    return nextAction;
  }

  const delay = action.debounce ? 500 : 0;

  clearTimeout(searchHandle);
  setTimeout(() => {
    const {
      appState,
      search: { searchQuery },
    } = store.getState();
    const matchingNotes = filterNotes({ ...appState, filter: searchQuery });

    store.dispatch(
      actions.search.filterNotes(matchingNotes.map(note => note.id))
    );

    console.log(matchingNotes);
  }, delay);

  return nextAction;
};
