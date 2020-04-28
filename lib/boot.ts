if (__TEST__) {
  window.testEvents = [];
}

import './utils/ensure-platform-support';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'unorm';

import React from 'react';
import App from './app';
import Modal from 'react-modal';
import getConfig from '../get-config';
import store from './state';
import { setAccountName } from './state/settings/actions';
import { parse } from 'cookie';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { get } from 'lodash';

import '../scss/style.scss';

import isDevConfig from './utils/is-dev-config';
const config = getConfig();

const cookie = parse(document.cookie);

// Signs out the user from app engine and redirects to signin page
const redirectToWebSigninIfNecessary = () => {
  if (!config.is_app_engine) {
    return;
  }

  if (window.webConfig && window.webConfig.signout) {
    window.webConfig.signout(function () {
      window.location = `${config.app_engine_url}/`;
    });
  }
};

let props = {
  isDevConfig: isDevConfig(config?.development),
};

// If we sign in with a different username, ensure storage is reset
function resetStorageIfAccountChanged(newAccountName: string) {
  const accountName = get(store.getState(), 'settings.accountName', '');
  if (accountName !== newAccountName) {
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
