import { v4 as uuid } from 'uuid';

import * as A from '../action-types';
import * as S from '../';

export const middleware: S.Middleware = (store) => (
  next: (action: A.ActionType) => A.ActionType
) => (action: A.ActionType) => {
  const state = store.getState();

  switch (action.type) {
    case 'CREATE_NOTE':
      return next({
        type: 'CREATE_NOTE_WITH_ID',
        noteId: uuid(),
        note: action.note,
      });

    case 'IMPORT_NOTE':
      return next({
        type: 'IMPORT_NOTE_WITH_ID',
        noteId: uuid(),
        note: action.note,
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

    default:
      return next(action);
  }
};

export default middleware;
