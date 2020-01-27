import './utils/ensure-platform-support';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'unorm';

import React from 'react';
import App from './app';
import Modal from 'react-modal';
import Debug from 'debug';
import { initClient } from './client';
import getConfig from '../get-config';
import store from './state';
import {
  reset as resetAuth,
  setAuthorized,
  setInvalidCredentials,
  setLoginError,
  setPending as setPendingAuth,
} from './state/auth/actions';
import { setAccountName } from './state/settings/actions';
import analytics from './analytics';
import { Auth } from 'simperium';
import { parse } from 'cookie';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { get, some } from 'lodash';

import '../scss/style.scss';

import { content as welcomeMessage } from './welcome-message';

import appState from './flux/app-state';
import isDevConfig from './utils/is-dev-config';
import { normalizeForSorting } from './utils/note-utils';
const { newNote } = appState.actionCreators;

const config = getConfig();

const cookie = parse(document.cookie);
const auth = new Auth(config.app_id, config.app_key);
const appProvider = 'simplenote.com';

const appID = config.app_id;
let token = cookie.token || localStorage.access_token;

// Signs out the user from app engine and redirects to signin page
const redirectToWebSigninIfNecessary = () => {
  if (!config.is_app_engine) {
    return;
  }

  if (window.webConfig && window.webConfig.signout) {
    window.webConfig.signout(function() {
      window.location = `${config.app_engine_url}/`;
    });
  }
};

// Redirect to web sign in if running on App Engine
if (!token && config.is_app_engine) {
  redirectToWebSigninIfNecessary();
}

const client = initClient({
  appID,
  token,
  bucketConfig: {
    note: {
      beforeIndex: function(note) {
        var content = (note.data && note.data.content) || '';

        return {
          ...note,
          contentKey: normalizeForSorting(content),
        };
      },
      configure: function(objectStore) {
        objectStore.createIndex('modificationDate', 'data.modificationDate');
        objectStore.createIndex('creationDate', 'data.creationDate');
        objectStore.createIndex('alphabetical', 'contentKey');
      },
    },
    preferences: function(objectStore) {
      console.log('Configure preferences', objectStore); // eslint-disable-line no-console
    },
    tag: function(objectStore) {
      console.log('Configure tag', objectStore); // eslint-disable-line no-console
    },
  },
  database: 'simplenote',
  version: 42,
});

const l = msg => {
  const debug = Debug('client');

  return function() {
    debug.apply(debug, [msg].concat([].slice.call(arguments)));
  };
};

client
  .on('connect', l('Connected'))
  .on('disconnect', l('Not connected'))
  .on('message', l('<='))
  .on('send', l('=>'))
  .on('unauthorized', l('Not authorized'));

client.on('unauthorized', () => {
  // If a token exists, we probaly reached this point from a password change.
  // The client should sign out the user, but preserve db content in case
  // some data has not synced yet.
  if (token) {
    client.clearAuthorization();
    redirectToWebSigninIfNecessary();
    return;
  }

  client.reset().then(() => {
    console.log('Reset complete'); // eslint-disable-line no-console
  });
});

let props = {
  client: client,
  noteBucket: client.bucket('note'),
  preferencesBucket: client.bucket('preferences'),
  tagBucket: client.bucket('tag'),
  isDevConfig: isDevConfig(config),
  onAuthenticate: (username, password) => {
    if (!(username && password)) {
      return;
    }

    store.dispatch(setPendingAuth());
    auth
      .authorize(username, password)
      .then(user => {
        resetStorageIfAccountChanged(username);
        if (!user.access_token) {
          return store.dispatch(resetAuth);
        }

        store.dispatch(setAccountName(username));
        store.dispatch(setAuthorized());
        localStorage.access_token = user.access_token;
        token = user.access_token;
        client.setUser(user);
        analytics.tracks.recordEvent('user_signed_in');
      })
      .catch(({ message }) => {
        if (
          some([
            'invalid password' === message,
            message.startsWith('unknown username:'),
          ])
        ) {
          store.dispatch(setInvalidCredentials());
        } else {
          store.dispatch(setLoginError());
        }
      });
  },
  onCreateUser: (username, password) => {
    if (!(username && password)) {
      return;
    }

    store.dispatch(setPendingAuth());
    auth
      .create(username, password, appProvider)
      .then(user => {
        resetStorageIfAccountChanged(username);
        if (!user.access_token) {
          return store.dispatch(resetAuth);
        }

        store.dispatch(setAccountName(username));
        store.dispatch(setAuthorized());
        localStorage.setItem('access_token', user.access_token);
        token = user.access_token;
        client.setUser(user);
        analytics.tracks.recordEvent('user_account_created');
        analytics.tracks.recordEvent('user_signed_in');
      })
      .then(() =>
        store.dispatch(
          newNote({
            noteBucket: client.bucket('note'),
            content: welcomeMessage,
          })
        )
      )
      .catch(() => {
        store.dispatch(setLoginError());
      });
  },
  onSignOut: () => {
    delete localStorage.access_token;
    token = null;
    store.dispatch(setAccountName(null));
    client.deauthorize();
    redirectToWebSigninIfNecessary();
    analytics.tracks.recordEvent('user_signed_out');
  },
  authorizeUserWithToken: (accountName, userToken) => {
    resetStorageIfAccountChanged(accountName);
    localStorage.setItem('access_token', userToken);
    token = userToken;
    store.dispatch(setAccountName(accountName));
    store.dispatch(setAuthorized());

    const user = { access_token: userToken };
    client.setUser(user);

    analytics.tracks.recordEvent('user_signed_in');
  },
};

// If we sign in with a different username, ensure storage is reset
function resetStorageIfAccountChanged(newAccountName) {
  const accountName = get(store.getState(), 'settings.accountName', '');
  if (accountName !== newAccountName) {
    client.reset();
  }
}

// Set account email if app engine provided it
if (cookie.email && config.is_app_engine) {
  // If the stored email doesn't match, we should reset the app storage
  resetStorageIfAccountChanged(cookie.email);

  store.dispatch(setAccountName(cookie.email));
}

Modal.setAppElement('#root');

render(
  React.createElement(Provider, { store }, React.createElement(App, props)),
  document.getElementById('root')
);
