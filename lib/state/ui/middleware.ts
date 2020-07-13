import * as A from '../action-types';
import * as S from '../';

export const middleware: S.Middleware = (store) => (
  next: (action: A.ActionType) => any
) => (action: A.ActionType) => {
  switch (action.type) {
    case 'SELECT_NOTE_ABOVE': {
      const {
        ui: { filteredNotes, openedNote },
      } = store.getState();

      if (filteredNotes.length === 0) {
        return;
      }

      if (!openedNote) {
        return next({
          type: 'SELECT_NOTE',
          noteId: filteredNotes[0],
        });
      }

      const noteAt = filteredNotes.findIndex((noteId) => noteId === openedNote);
      if (noteAt === 0) {
        return;
      }

      return next({
        type: 'SELECT_NOTE',
        noteId: noteAt === -1 ? filteredNotes[0] : filteredNotes[noteAt - 1],
      });
    }

    case 'SELECT_NOTE_BELOW': {
      const {
        ui: { filteredNotes, openedNote },
      } = store.getState();

      if (filteredNotes.length === 0) {
        return;
      }

      if (!openedNote) {
        return next({
          type: 'SELECT_NOTE',
          noteId: filteredNotes[0],
        });
      }

      const noteAt = filteredNotes.findIndex((noteId) => noteId === openedNote);
      if (noteAt === filteredNotes.length - 1) {
        return;
      }

      return next({
        type: 'SELECT_NOTE',
        noteId: noteAt === -1 ? filteredNotes[0] : filteredNotes[noteAt + 1],
      });
    }

    case 'SHOW_ALL_NOTES':
      // this middleware runs after the search middleware which is important
      // because we're reading the new search results which came as a result
      // of changing the note filter from trash or a tag to "all notes"
      return next({
        ...action,
        meta: {
          ...action.meta,
          nextNoteToOpen: action.meta?.searchResults?.noteIds[0],
        },
      });

    default:
      return next(action);
  }
};

export default middleware;
