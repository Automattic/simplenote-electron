import { v4 as uuid } from 'uuid';

import exportZipArchive from '../../utils/export';

import type * as A from '../action-types';
import type * as S from '../';
import type * as T from '../../types';

export const middleware: S.Middleware = (store) => (
  next: (action: A.ActionType) => A.ActionType
) => (action: A.ActionType) => {
  const state = store.getState();

  switch (action.type) {
    case 'CREATE_NOTE': {
      const noteId = uuid() as T.EntityId;

      // preserve last markdown setting
      const topNoteId = state.ui.filteredNotes[0];
      const topNote = topNoteId && state.data.notes.get(topNoteId);
      const useMarkdown = topNote?.systemTags.includes('markdown');
      const markdownInNote = action.note?.systemTags?.indexOf('markdown') ?? -1;
      const systemTags = action.note?.systemTags?.slice() ?? [];

      if (useMarkdown && -1 === markdownInNote) {
        systemTags.push('markdown');
      } else if (!useMarkdown && markdownInNote >= 0) {
        systemTags.splice(markdownInNote, 1);
      }

      return next({
        type: 'CREATE_NOTE_WITH_ID',
        noteId,
        note: { ...action.note, systemTags },
        meta: {
          nextNoteToOpen: noteId,
        },
      });
    }

    case 'DELETE_OPEN_NOTE_FOREVER':
      if (!state.ui.openedNote) {
        return;
      }

      return next({
        type: 'DELETE_NOTE_FOREVER',
        noteId: state.ui.openedNote,
      });

    case 'EMPTY_TRASH': {
      const result = next(action);
      state.data.notes.forEach((note, noteId) => {
        if (note.deleted) {
          store.dispatch({ type: 'DELETE_NOTE_FOREVER', noteId: noteId });
        }
      });
      return result;
    }

    case 'EXPORT_NOTES':
      exportZipArchive(state.data.notes);
      return next(action);

    case 'IMPORT_NOTE':
      return next({
        type: 'IMPORT_NOTE_WITH_ID',
        noteId: uuid() as T.EntityId,
        note: action.note,
      });

    case 'RESTORE_NOTE_REVISION': {
      const revision = state.data.noteRevisions
        .get(action.noteId)
        .get(action.version);

      return revision
        ? next({
            ...action,
            note: revision,
          })
        : next(action);
    }

    case 'RESTORE_OPEN_NOTE':
      if (!state.ui.openedNote) {
        return;
      }

      return next({
        type: 'RESTORE_NOTE',
        noteId: state.ui.openedNote,
      });

    case 'TOGGLE_ANALYTICS':
      return next({
        type: 'SET_ANALYTICS',
        allowAnalytics: !state.data.analyticsAllowed,
      });

    case 'TRASH_OPEN_NOTE':
      if (!state.ui.openedNote) {
        return;
      }

      return next({
        type: 'TRASH_NOTE',
        noteId: state.ui.openedNote,
      });

    default:
      return next(action);
  }
};

export default middleware;
