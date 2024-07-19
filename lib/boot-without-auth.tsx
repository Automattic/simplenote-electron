import React, { Component } from 'react';
import { render } from 'react-dom';
import { Auth as AuthApp } from './auth';
import { Auth as SimperiumAuth } from 'simperium';
import { recordEvent } from './state/analytics/middleware';
import { validatePassword } from './utils/validate-password';
import Modal from 'react-modal';
import classNames from 'classnames';
import AboutDialog from './dialogs/about';
import ErrorBoundary from './error-boundary';

import '../scss/style.scss';

type Props = {
  onAuth: (token: string, username: string) => any;
};

type State = {
  authStatus:
    | 'account-creation-requested'
    | 'compromised-password'
    | 'unsubmitted'
    | 'submitting'
    | 'insecure-password'
    | 'invalid-credentials'
    | 'unknown-error'
    | 'verification-required'
    | 'too-many-requests';
  emailSentTo: string;
  showAbout: boolean;
};

type User = {
  access_token?: string;
};

const auth = new SimperiumAuth(config.app_id, config.app_key);

class AppWithoutAuth extends Component<Props, State> {
  state: State = {
    authStatus: 'unsubmitted',
    emailSentTo: '',
    showAbout: false,
  };

  systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  componentDidMount() {
    window.electron?.receive('appCommand', this.onAppCommand);
    document.body.dataset.theme = this.systemTheme;

    window.electron?.receive('tokenLogin', (url) => {
      const { searchParams } = new URL(url);
      const simperiumToken = searchParams.get('token');
      const email = atob(searchParams.get('email'));
      this.tokenLogin(email, simperiumToken);
    });
  }

  login(token: string, username: string) {
    window.electron?.removeListener('appCommand');
    window.electron?.removeListener('tokenLogin');
    this.props.onAuth(token, username);
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
          const message = error?.underlyingError.message ?? '';
          if (
            'invalid login' === message ||
            message.startsWith('unknown username:')
          ) {
            // We check for compromised password before verified account as if the password is
            // compromised it will require a password reset. During that process unverified
            // accounts will be verified as it requires an email to the account address
            this.setState({ authStatus: 'invalid-credentials' });
          } else if ('compromised password' === message) {
            this.setState({ authStatus: 'compromised-password' });
          } else if ('verification required' === message) {
            this.setState({ authStatus: 'verification-required' });
          } else if ('too many requests' === message) {
            this.setState({ authStatus: 'too-many-requests' });
          } else {
            this.setState({ authStatus: 'unknown-error' });
          }
        });
    });
  };

  requestSignup = (email: string) => {
    const username = email.trim().toLowerCase();
    if (!username) {
      return;
    }

    this.setState({ authStatus: 'submitting' }, async () => {
      try {
        const response = await fetch(
          'https://app.simplenote.com/account/request-signup',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username }),
          }
        );
        if (response.ok) {
          recordEvent('user_account_creation_requested');
          this.setState({ authStatus: 'account-creation-requested' });
          this.setState({ emailSentTo: username });
        } else {
          this.setState({ authStatus: 'unknown-error' });
        }
      } catch {
        this.setState({ authStatus: 'unknown-error' });
      }
    });
  };

  tokenLogin = (username: string, token: string) => {
    this.login(token, username, false);
  };

  render() {
    return (
      <div className="app">
        <ErrorBoundary>
          <AuthApp
            accountCreationRequested={
              this.state.authStatus === 'account-creation-requested'
            }
            authPending={this.state.authStatus === 'submitting'}
            emailSentTo={this.state.emailSentTo}
            hasInsecurePassword={this.state.authStatus === 'insecure-password'}
            hasCompromisedPassword={
              this.state.authStatus === 'compromised-password'
            }
            hasInvalidCredentials={
              this.state.authStatus === 'invalid-credentials'
            }
            hasUnverifiedAccount={
              this.state.authStatus === 'verification-required'
            }
            hasTooManyRequests={this.state.authStatus === 'too-many-requests'}
            hasLoginError={this.state.authStatus === 'unknown-error'}
            login={this.authenticate}
            tokenLogin={this.tokenLogin}
            resetErrors={() =>
              this.setState({ authStatus: 'unsubmitted', emailSentTo: '' })
            }
            requestSignup={this.requestSignup}
          />
          {this.state.showAbout && (
            <Modal
              key="aboutDialogModal"
              className="dialog-renderer__content"
              contentLabel=""
              isOpen
              onRequestClose={this.onDismissDialog}
              overlayClassName="dialog-renderer__overlay"
              portalClassName={classNames('dialog-renderer__portal')}
            >
              <AboutDialog key="about" closeDialog={this.onDismissDialog} />
            </Modal>
          )}
        </ErrorBoundary>
      </div>
    );
  }
}

export const boot = (onAuth: (token: string, username: string) => any) => {
  Modal.setAppElement('#root');
  render(<AppWithoutAuth onAuth={onAuth} />, document.getElementById('root'));
};
