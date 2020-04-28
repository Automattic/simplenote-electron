import debugFactory from 'debug';
import { parse } from 'cookie';
import simperium from 'simperium';

import getConfig from '../../../get-config';
import actions from '../actions';

import { toggleSystemTag } from '../domain/notes';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

const { app_id: appId, is_app_engine: isAppEngine } = getConfig();
const debug = debugFactory('simperium');
const debugClient = debugFactory('simperium:client');
const logClientMessage = (title: string) => (...args: unknown[]) =>
  debugClient(title, ...args);

const token =
  parse(document.cookie)?.token ?? localStorage.getItem('access_token');

type DMPDelta<T> =
  | { o: '+'; v: T }
  | { o: '-' }
  | { o: 'r'; v: T }
  | { o: 'I'; v: number }
  | { o: 'L'; v: { [index: number]: DMPDelta<T> } }
  | { o: 'O'; v: { [K in keyof T]: DMPDelta<T[K]> } }
  | { o: 'd'; v: string };

type UpdateInfo<T> = {
  isIndexing: boolean;
  original: T;
  patch: { [K in keyof Partial<T>]: DMPDelta<T[K]> };
};

export const middleware: S.Middleware = (store) => {
  // fun fact, we can connect before having a valid token
  // we just need to send a new token upon authorization
  const client = simperium(appId, token);

  client
    .on('connect', logClientMessage('Connected'))
    .on('disconnect', logClientMessage('Disconnected'))
    .on('message', logClientMessage('<='))
    .on('send', logClientMessage('=>'))
    .on('unauthorized', logClientMessage('Unauthorized'));

  client.on('unauthorized', () => {
    console.log('SIGN ME OUT!');
  });

  const noteBucket = client.bucket('note');
  const tagBucket = client.bucket('tag');
  const preferencesBucket = client.bucket('preferences');

  const fetchRevisions = (store: S.Store, state: S.State) => {
    if (!state.ui.showRevisions || !state.ui.note) {
      return;
    }

    const note = state.ui.note;

    noteBucket.getRevisions(
      note.id,
      (error: unknown, revisions: T.NoteEntity[]) => {
        if (error) {
          return debug(
            `Failed to load revisions for note ${note.id}: ${error}`
          );
        }

        const thisState = store.getState();
        if (!(thisState.ui.note && note.id === thisState.ui.note.id)) {
          return;
        }

        store.dispatch(actions.ui.storeRevisions(note.id, revisions));
      }
    );
  };

  return (next) => (action: A.ActionType) => {
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
    }

    return result;
  };
};

export default middleware;
