import type * as A from '../../state/action-types';
import type * as S from '../../state';

import { clearNoteHistory } from './note-history-memory';

export const middleware: S.Middleware =
  () => (next) => (action: A.ActionType) => {
    switch (action.type) {
      case 'DELETE_NOTE_FOREVER':
      case 'REMOTE_NOTE_DELETE_FOREVER':
      case 'NOTE_BUCKET_REMOVE':
        clearNoteHistory(action.noteId);
        break;
    }

    return next(action);
  };
