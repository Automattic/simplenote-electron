import debugFactory from 'debug';
import simperium from 'simperium';
import actions from '../actions';

import { toggleSystemTag } from '../domain/notes';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

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

const debug = debugFactory('simperium-middleware');
const clientDebug = debugFactory('client');
const l = (msg: string) => (...args: unknown[]) => clientDebug(msg, ...args);

export const initSimperium = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
): S.Middleware => (store) => {
  console.log({ username, token });
  const client = simperium('chalk-bump-f49', token, {});

  client
    .on('connect', l('Connected'))
    .on('disconnect', l('Not connected'))
    .on('message', l('<='))
    .on('send', l('=>'))
    .on('unauthorized', l('Not authorized'));

  client.on('message', (message: string) => {
    if (!message.startsWith('0:auth:')) {
      return;
    }

    const [, , authUsername] = message.split(':');
    if (authUsername !== username) {
      client.end();
      logout();
      return;
    }
  });

  client.on('unauthorized', () => {
    console.log('logging out');
    client.end();
    logout();
  });

  const noteBucket = client.bucket('note');
  const preferencesBucket = client.bucket('preferences');
  const tagBucket = client.bucket('tag');

  noteBucket.on(
    'update',
    (noteId: T.EntityId, data: T.Note, updateInfo: UpdateInfo<T.Note>) => {
      store.dispatch(actions.simperium.addNote(noteId, data));
    }
  );

  noteBucket.on('remove', (noteId: T.EntityId) => {
    store.dispatch(actions.simperium.removeNote(noteId));
  });

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
        noteBucket.update(
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
