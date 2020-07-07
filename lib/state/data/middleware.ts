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

      return next({
        type: 'CREATE_NOTE_WITH_ID',
        noteId,
        note: action.note,
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

    case 'EXPORT_NOTES':
      exportZipArchive([...state.data.notes.values()]);
      return next(action);

    case 'IMPORT_NOTE':
      return next({
        type: 'IMPORT_NOTE_WITH_ID',
        noteId: uuid() as T.EntityId,
        note: action.note,
      });

    case 'INSERT_TASK':
      if (!state.ui.openedNote) {
        return;
      } else {
        return next({
          type: 'INSERT_TASK_INTO_NOTE',
          noteId: state.ui.openedNote,
          selection: state.ui.editorSelection.get(state.ui.openedNote) ?? [
            0,
            0,
            'LTR',
          ],
        });
      }

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
        allowAnalytics:
          // if we don't know then we should default to opting out
          state.data.analyticsAllowed === null
            ? false
            : !state.data.analyticsAllowed,
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

if ('development' === process.env.NODE_ENV) {
  window.prefill = () =>
    Promise.all([
      import('../../utils/import/simplenote'),
      import('../../utils/import'),
      import('./test_account.json'),
    ]).then(([Simplenote, CoreImporter, data]) => {
      const notes = {
        activeNotes: Simplenote.convertModificationDates(data.activeNotes),
        trashedNotes: Simplenote.convertModificationDates(data.trashedNotes),
      };

      new CoreImporter.default((note) =>
        window.dispatch({
          type: 'IMPORT_NOTE_WITH_ID',
          noteId: uuid(),
          note,
        })
      ).importNotes(notes);
    });
}

export default middleware;
