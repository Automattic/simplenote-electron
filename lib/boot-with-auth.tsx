if (__TEST__) {
  window.testEvents = [];
}

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'unorm';

import React from 'react';
import App from './app';
import Modal from 'react-modal';
import Debug from 'debug';
import { initClient } from './client';
import getConfig from '../get-config';
import { makeStore } from './state';
import actions from './state/actions';
import { initSimperium } from './state/simperium/middleware';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import '../scss/style.scss';

import isDevConfig from './utils/is-dev-config';
import { normalizeForSorting } from './utils/note-utils';

import * as T from './types';

const config = getConfig();
const appID = config.app_id;

export const bootWithToken = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
) => {
  const client = initClient({
    appID,
    token,
    bucketConfig: {
      note: {
        beforeIndex: function (note: T.NoteEntity) {
          var content = (note.data && note.data.content) || '';

          return {
            ...note,
            contentKey: normalizeForSorting(content),
          };
        },
        configure: function (objectStore) {
          objectStore.createIndex('modificationDate', 'data.modificationDate');
          objectStore.createIndex('creationDate', 'data.creationDate');
          objectStore.createIndex('alphabetical', 'contentKey');
        },
      },
      preferences: function (objectStore) {
        console.log('Configure preferences', objectStore); // eslint-disable-line no-console
      },
      tag: function (objectStore) {
        console.log('Configure tag', objectStore); // eslint-disable-line no-console
      },
    },
    database: 'simplenote',
    version: 42,
  });

  const debug = Debug('client');
  const l = (msg: string) => (...args: unknown[]) => debug(msg, ...args);

  client
    .on('connect', l('Connected'))
    .on('disconnect', l('Not connected'))
    .on('message', l('<='))
    .on('send', l('=>'))
    .on('unauthorized', l('Not authorized'));

  Modal.setAppElement('#root');

  const store = makeStore(
    initSimperium(logout, token, username, createWelcomeNote, client)
  );

  store.dispatch(actions.settings.setAccountName(username));

  render(
    <Provider store={store}>
      <App
        client={client}
        noteBucket={client.bucket('note')}
        preferencesBucket={client.bucket('preferences')}
        tagBucket={client.bucket('tag')}
        isDevConfig={isDevConfig(config?.development)}
      />
    </Provider>,
    document.getElementById('root')
  );
};
