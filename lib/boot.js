import React from 'react';
import App from './app';
import getConfig from '../get-config';
import simperium from './simperium';
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
import { some } from 'lodash';

import '../scss/style.scss';

import { content as welcomeMessage } from './welcome-message';

import appState from './flux/app-state';
const { newNote } = appState.actionCreators;

const config = getConfig();

const cookie = parse(document.cookie);
const auth = new Auth(config.app_id, config.app_key);
const appProvider = 'simplenote.com';

const token = cookie.token || localStorage.access_token;
const appID = config.app_id;

// Redirect to web sign in if running on App Engine
if (!token && config.is_app_engine) {
  window.location = 'https://app.simplenote.com/signin';
}

const client = simperium({
  appID,
  token,
  bucketConfig: {
    note: {
      beforeIndex: function(note) {
        var systemTags = (note.data && note.data.systemTags) || [];
        var content = (note.data && note.data.content) || '';

        return {
          ...note,
          contentKey: content
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200)
            .toLowerCase(),
          pinned: systemTags.indexOf('pinned') !== -1,
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
  version: 41,
});

const l = msg => {
  return function() {
    // if (window.loggingEnabled)
    console.log.apply(console, [msg].concat([].slice.call(arguments))); // eslint-disable-line no-console
  };
};

client
  .on('connect', l('Connected'))
  .on('disconnect', l('Not connected'))
  // .on( 'message', l('<=') )
  // .on( 'send', l('=>') )
  .on('unauthorized', l('Not authorized'));

client.on('unauthorized', () => {
  // if there is no token, drop data, if there is a token it could potentially just be
  // a password change or something similar so don't kill the data
  if (token) {
    return;
  }

  client.reset().then(() => {
    console.log('Reset complete'); // eslint-disable-line no-console
  });
});

const app = document.createElement('div');

document.body.appendChild(app);

let props = {
  client: client,
  noteBucket: client.bucket('note'),
  preferencesBucket: client.bucket('preferences'),
  tagBucket: client.bucket('tag'),
  onAuthenticate: (username, password) => {
    if (!(username && password)) {
      return;
    }

    store.dispatch(setPendingAuth());
    auth
      .authorize(username, password)
      .then(user => {
        if (!user.access_token) {
          return store.dispatch(resetAuth);
        }

        store.dispatch(setAccountName(username));
        store.dispatch(setAuthorized());
        localStorage.access_token = user.access_token;
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
        if (!user.access_token) {
          return store.dispatch(resetAuth);
        }

        store.dispatch(setAccountName(username));
        store.dispatch(setAuthorized());
        localStorage.setItem('access_token', user.access_token);
        client.setUser(user);
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
    store.dispatch(setAccountName(null));
    client.deauthorize();
    if (config.signout) {
      config.signout(function() {
        window.location = '/';
      });
    }
    analytics.tracks.recordEvent('user_signed_out');
  },
  authorizeUserWithToken: (accountName, userToken) => {
    localStorage.setItem('access_token', userToken);
    store.dispatch(setAccountName(accountName));
    store.dispatch(setAuthorized());

    const user = { access_token: userToken };
    client.setUser(user);

    analytics.tracks.recordEvent('user_signed_in');
  },
};

render(
  React.createElement(Provider, { store }, React.createElement(App, props)),
  app
);
