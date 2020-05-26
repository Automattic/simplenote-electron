if (__TEST__) {
  window.testEvents = [];
}

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'unorm';

import React from 'react';
import App from './app';
import Modal from 'react-modal';
import getConfig from '../get-config';
import { makeStore } from './state';
import actions from './state/actions';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import '../scss/style.scss';

import isDevConfig from './utils/is-dev-config';

const config = getConfig();

export const bootWithToken = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
) => {
  Modal.setAppElement('#root');

  const store = makeStore();
  store.dispatch(actions.settings.setAccountName(username));

  Object.defineProperties(window, {
    dispatch: {
      get() {
        return store.dispatch;
      },
    },
    state: {
      get() {
        return store.getState();
      },
    },
  });

  render(
    <Provider store={store}>
      <App isDevConfig={isDevConfig(config?.development)} />
    </Provider>,
    document.getElementById('root')
  );
};
