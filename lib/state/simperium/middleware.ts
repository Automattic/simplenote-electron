import type { Client } from 'simperium';

import debugFactory from 'debug';
import actions from '../actions';

import { toggleSystemTag } from '../domain/notes';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

const debug = debugFactory('simperium-middleware');

export const initSimperium = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean,
  client: Client<'note' | 'preferences' | 'tag'>
): S.Middleware => (store) => {
  client.on('message', (message: string) => {
    if (!message.startsWith('0:auth:')) {
      return;
    }

    const [prefix, authenticatedUsername] = message.split('0:auth:');
    debug(`authenticated: ${authenticatedUsername}`);

    if (null === username) {
      return store.dispatch(
        actions.settings.setAccountName(authenticatedUsername)
      );
    }

    if (username !== authenticatedUsername) {
      debug(`was logged in as ${username} - logging out`);
      return logout();
    }
  });

  client.on('unauthorized', () => {
    logout();
  });

  const noteBucket = client.bucket('note');

  if (createWelcomeNote) {
    import(
      /* webpackChunkName: 'welcome-message' */ '../../welcome-message'
    ).then(({ content }) => {
      const now = Date.now() / 1000;
      noteBucket.add({
        content,
        deleted: false,
        systemTags: [],
        creationDate: now,
        modificationDate: now,
        shareURL: '',
        publishURL: '',
        tags: [],
      });
    });
  }

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
      case 'LOGOUT':
        throw new Error('logged out!');
        // client.reset().then(() => logout());
        return result;

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
