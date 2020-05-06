if (__TEST__) {
  window.testEvents = [];
}

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'unorm';

import React from 'react';
import App from './app';
import Modal from 'react-modal';
import { makeStore } from './state';
import { initSimperium } from './state/simperium/middleware';
import { render } from 'react-dom';
import { Provider } from 'react-redux';

import '../scss/style.scss';

export const bootWithToken = (
  logout: () => any,
  token: string,
  username: string | null,
  createWelcomeNote: boolean
) => {
  Modal.setAppElement('#root');
  render(
    <Provider
      store={makeStore(
        initSimperium(logout, token, username, createWelcomeNote)
      )}
    >
      <App />
    </Provider>,
    document.getElementById('root')
  );
};
