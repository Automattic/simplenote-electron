import debugFactory from 'debug';
import actions from '../actions';

import { toggleSystemTag } from '../domain/notes';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

const debug = debugFactory('simperium-middleware');

type Buckets = {
  note: T.Bucket<T.Note>;
  preferences: T.Bucket<T.Preferences>;
};

const buckets: Buckets = {} as Buckets;

export const storeBuckets = (newBuckets: Buckets) => {
  buckets.note = newBuckets.note;
  buckets.preferences = newBuckets.preferences;
};

const fetchRevisions = (store: S.Store, state: S.State) => {
  if (!state.ui.showRevisions || !state.ui.note) {
    return;
  }

  const note = state.ui.note;

  buckets.note.getRevisions(
    note.id,
    (error: unknown, revisions: T.NoteEntity[]) => {
      if (error) {
        return debug(`Failed to load revisions for note ${note.id}: ${error}`);
      }

      const thisState = store.getState();
      if (!(thisState.ui.note && note.id === thisState.ui.note.id)) {
        return;
      }

      store.dispatch(actions.ui.storeRevisions(note.id, revisions));
    }
  );
};

export const middleware: S.Middleware = store => {
  return next => (action: A.ActionType) => {
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'SET_SYSTEM_TAG':
        buckets.note.update(
          action.note.id,
          toggleSystemTag(action.note, action.tagName, action.shouldHaveTag)
            .data
        );
        break;

      case 'REVISIONS_TOGGLE':
        fetchRevisions(store, nextState);
        break;

      case 'TOGGLE_ANALYTICS':
        buckets.preferences.update('preferences-key', nextState.preferences);
        break;

      case 'ANALYTICS_REMOTE_UPDATE':
        window.analyticsEnabled = action.sendAnalytics;
        break;
    }

    return result;
  };
};

export default middleware;
