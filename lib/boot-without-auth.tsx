import React, { Component } from 'react';
import { render } from 'react-dom';
import { Auth as AuthApp } from './auth';
import { Auth as SimperiumAuth } from 'simperium';
import analytics from './analytics';
import { validatePassword } from '../utils/validate-password';

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
  };

  authenticate = (username: string, password: string) => {
    if (!(username && password)) {
      return;
    }

    this.setState({ authStatus: 'submitting' }, () => {
      auth
        .authorize(username, password)
        .then((user: User) => {
          if (!validatePassword(password, username)) {
            this.setState({ authStatus: 'insecure-password' });
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

  createUser = (username: string, password: string) => {
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
      </div>
    );
  }
}

export const boot = (
  onAuth: (token: string, username: string, createWelcomeNote: boolean) => any
) => {
  render(<AppWithoutAuth onAuth={onAuth} />, document.getElementById('root'));
};
