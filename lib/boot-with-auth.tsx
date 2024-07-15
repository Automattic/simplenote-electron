if (__TEST__) {
  window.testEvents = [];
}

import React from 'react';
import App from './app';
import { ErrorBoundaryWithAnalytics } from './error-boundary';
import Modal from 'react-modal';
import { makeStore } from './state';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { initSimperium } from './state/simperium/middleware';

import '../scss/style.scss';

import isDevConfig from './utils/is-dev-config';

export const bootWithToken = (
  logout: () => any,
  token: string,
  username: string | null
) => {
  Modal.setAppElement('#root');

  makeStore(username, initSimperium(logout, token, username)).then((store) => {
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

    window.electron?.send('appStateUpdate', {
      settings: store.getState().settings,
      editMode: store.getState().ui.editMode,
    });

    render(
      <Provider store={store}>
        <ErrorBoundaryWithAnalytics
          isDevConfig={isDevConfig(config?.development)}
        >
          <App isDevConfig={isDevConfig(config?.development)} />
        </ErrorBoundaryWithAnalytics>
      </Provider>,
      document.getElementById('root')
    );
  });
};
