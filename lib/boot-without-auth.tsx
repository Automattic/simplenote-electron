import React, { Component } from 'react';
import { render } from 'react-dom';
import { Auth as AuthApp } from './auth';
import { Auth as SimperiumAuth } from 'simperium';
import { recordEvent } from './state/analytics/middleware';
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
    | 'account-creation-requested'
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

    window.electron?.receive('tokenLogin', (url) => {
      const { searchParams } = new URL(url);
      const simpToken = searchParams.get('token');
      const email = searchParams.get('email');
      this.tokenLogin(email, simpToken);
    });
  }

  login(token: string, username: string, createWelcomeNote: boolean) {
    window.electron?.removeListener('appCommand');
    this.props.onAuth(token, username, createWelcomeNote);
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
          this.login(user.access_token, username, false);
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

    this.setState({ authStatus: 'submitting' }, async () => {
      const response = await fetch(
        'https://app.simplenote.com/request-signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, password }),
        }
      );

      if (response.ok) {
        recordEvent('user_account_creation_requested');
      } else {
        this.setState({ authStatus: 'unknown-error' });
      }
    });
  };

  tokenLogin = (username: string, token: string) => {
    this.login(token, username, false);
  };

  render() {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light';

    return (
      <div className={`app theme-${systemTheme}`}>
        <AuthApp
          accountCreationRequested={
            this.state.authStatus === 'account-creation-requested'
          }
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
  Modal.setAppElement('#root');
  render(<AppWithoutAuth onAuth={onAuth} />, document.getElementById('root'));
};
