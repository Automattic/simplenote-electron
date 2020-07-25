import React, { Component } from 'react';
import { createStore } from 'redux';
import { Provider } from 'react-redux';
import { render } from 'react-dom';
import { Auth as AuthApp } from './auth';
import { Auth as SimperiumAuth } from 'simperium';
import analytics from './analytics';
import { validatePassword } from './utils/validate-password';
import Modal from 'react-modal';
import classNames from 'classnames';
import AboutDialog from './dialogs/about';

import getConfig from '../get-config';

import '../scss/style.scss';

type Props = {
  onAuth: (token: string, username: string, createWelcomeNote: boolean) => any;
};

type State = {
  authStatus:
    | 'unsubmitted'
    | 'submitting'
    | 'insecure-password'
    | 'invalid-credentials'
    | 'unknown-error';
  showAbout: boolean;
};

type User = {
  access_token?: string;
};

const appProvider = 'simplenote.com';
const config = getConfig();
const auth = new SimperiumAuth(config.app_id, config.app_key);

class AppWithoutAuth extends Component<Props, State> {
  state: State = {
    authStatus: 'unsubmitted',
    showAbout: false,
  };

  componentDidMount() {
    window.electron?.receive('appCommand', this.onAppCommand);
  }

  componentWillUnmount() {
    window.electron?.removeListener('appCommand');
  }

  onAppCommand = (event) => {
    if ('showDialog' === event.action && 'ABOUT' === event.dialog) {
      this.setState({ showAbout: true });
    }
  };

  onDismissDialog = (event) => {
    this.setState({ showAbout: false });
  };

  authenticate = (usernameArg: string, password: string) => {
    const username = usernameArg.trim().toLowerCase();

    if (!(username && password)) {
      return;
    }

    this.setState({ authStatus: 'submitting' }, () => {
      auth
        .authorize(username, password)
        .then((user: User) => {
          if (!validatePassword(password, username)) {
            this.setState({ authStatus: 'insecure-password' });
            return;
          }
          if (!user.access_token) {
            throw new Error('missing access token');
          }
          this.props.onAuth(user.access_token, username, false);
        })
        .catch((error: unknown) => {
          if (
            'invalid password' === error?.message ||
            error?.message.startsWith('unknown username:')
          ) {
            this.setState({ authStatus: 'invalid-credentials' });
          } else {
            this.setState({ authStatus: 'unknown-error' });
          }
        });
    });
  };

  createUser = (usernameArg: string, password: string) => {
    const username = usernameArg.trim().toLowerCase();
    if (!(username && password)) {
      return;
    }

    this.setState({ authStatus: 'submitting' }, () => {
      auth
        .create(username, password, appProvider)
        .then((user: User) => {
          if (!user.access_token) {
            throw new Error('missing access token');
          }

          analytics.tracks.recordEvent('user_account_created');
          this.props.onAuth(user.access_token, username, true);
        })
        .catch(() => {
          this.setState({ authStatus: 'unknown-error' });
        });
    });
  };

  tokenLogin = (username: string, token: string) => {
    this.props.onAuth(token, username, false);
  };

  render() {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light';

    return (
      <div className={`app theme-${systemTheme}`}>
        <AuthApp
          authPending={this.state.authStatus === 'submitting'}
          hasInsecurePassword={this.state.authStatus === 'insecure-password'}
          hasInvalidCredentials={
            this.state.authStatus === 'invalid-credentials'
          }
          hasLoginError={this.state.authStatus === 'unknown-error'}
          login={this.authenticate}
          signup={this.createUser}
          tokenLogin={this.tokenLogin}
          resetErrors={() => this.setState({ authStatus: 'unsubmitted' })}
        />
        {this.state.showAbout && (
          <Modal
            key="aboutDialogModal"
            className="dialog-renderer__content"
            contentLabel=""
            isOpen
            onRequestClose={this.onDismissDialog}
            overlayClassName="dialog-renderer__overlay"
            portalClassName={classNames(
              'dialog-renderer__portal',
              'theme-' + systemTheme
            )}
          >
            <AboutDialog key="about" closeDialog={this.onDismissDialog} />
          </Modal>
        )}
      </div>
    );
  }
}

export const boot = (
  onAuth: (token: string, username: string, createWelcomeNote: boolean) => any
) => {
  const reducer = (state, action) => state;
  const store = createStore(reducer);
  Modal.setAppElement('#root');
  render(
    <Provider store={store}>
      <AppWithoutAuth onAuth={onAuth} />
    </Provider>,
    document.getElementById('root')
  );
};
