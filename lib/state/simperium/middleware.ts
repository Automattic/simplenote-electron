import { default as createClient } from 'simperium';

import debugFactory from 'debug';
import actions from '../actions';
import { start as startConnectionMonitor } from './connection-monitor';

import * as A from '../action-types';
import * as S from '../';
import * as T from '../../types';

const debug = debugFactory('simperium-middleware');

export const initSimperium = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
): S.Middleware => (store) => {
  const client = createClient('chalk-bump-f49', token);

  startConnectionMonitor(client, store);

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

  return (next) => (action: A.ActionType) => {
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'LOGOUT':
        throw new Error('logged out!');
        // client.reset().then(() => logout());
        return result;
    }

    return result;
  };
};
