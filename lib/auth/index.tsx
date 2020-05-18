import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import cryptoRandomString from '../utils/crypto-random-string';
import { get } from 'lodash';
import getConfig from '../../get-config';
import SimplenoteLogo from '../icons/simplenote';
import Spinner from '../components/spinner';
import { validatePassword } from '../utils/validate-password';

import { isElectron, isMac } from '../utils/platform';
import { viewExternalUrl } from '../utils/url-utils';

type OwnProps = {
  authPending: boolean;
  hasInsecurePassword: boolean;
  hasInvalidCredentials: boolean;
  hasLoginError: boolean;
  login: (username: string, password: string) => any;
  signup: (username: string, password: string) => any;
  tokenLogin: (username: string, token: string) => any;
  resetErrors: () => any;
};

type Props = OwnProps;

export class Auth extends Component<Props> {
  state = {
    isCreatingAccount: false,
    passwordErrorMessage: null,
    onLine: window.navigator.onLine,
  };

  componentDidMount() {
    window.addEventListener('online', this.setConnectivity, false);
    window.addEventListener('offline', this.setConnectivity, false);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.setConnectivity, false);
    window.removeEventListener('offline', this.setConnectivity, false);
  }

  setConnectivity = () => this.setState({ onLine: window.navigator.onLine });

  render() {
    // Don't render this component when running on the web
    const config = getConfig();
    if (config.is_app_engine) {
      return null;
    }

    const { isCreatingAccount, passwordErrorMessage } = this.state;
    const submitClasses = classNames('button', 'button-primary', {
      pending: this.props.authPending,
    });

    const signUpText = 'Sign up';
    const logInText = 'Log in';
    const buttonLabel = isCreatingAccount ? signUpText : logInText;
    const helpLinkLabel = isCreatingAccount ? logInText : signUpText;
    const helpMessage = isCreatingAccount
      ? 'Already have an account?'
      : "Don't have an account?";
    const errorMessage = isCreatingAccount
      ? 'Could not create account. Please try again.'
      : 'Could not log in with the provided email address and password.';

    return (
      <div className="login">
        {isMac && <div className="login__draggable-area" />}
        <SimplenoteLogo />
        <form className="login__form" onSubmit={this.onLogin}>
          <h1>{buttonLabel}</h1>
          {!this.state.onLine && (
            <p className="login__auth-message is-error">Offline</p>
          )}
          {this.props.hasInsecurePassword && (
            <p
              className="login__auth-message is-error"
              data-error-name="invalid-login"
            >
              Your password is insecure and must be{' '}
              <a
                className="login__reset"
                href={
                  'https://app.simplenote.com/reset/?email=' +
                  encodeURIComponent(get(this.usernameInput, 'value'))
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={this.onForgot}
              >
                reset
              </a>
              . Passwords must be between 8 and 64 characters long and may not
              include your email address, new lines, or tabs.
            </p>
          )}
          {this.props.hasInvalidCredentials && (
            <p
              className="login__auth-message is-error"
              data-error-name="invalid-login"
            >
              Could not log in with the provided email address and password.
            </p>
          )}
          {this.props.hasLoginError && (
            <p
              className="login__auth-message is-error"
              data-error-name="invalid-login"
            >
              {errorMessage}
            </p>
          )}
          {passwordErrorMessage && (
            <p className="login__auth-message is-error">
              {passwordErrorMessage}
            </p>
          )}
          <label
            className="login__field theme-color-border"
            htmlFor="login__field-username"
          >
            Email
          </label>
          <input
            id="login__field-username"
            onKeyDown={this.onInput}
            placeholder="Email"
            ref={(ref) => (this.usernameInput = ref)}
            spellCheck={false}
            type="email"
            required
            autoFocus
          />
          <label
            className="login__field theme-color-border"
            htmlFor="login__field-password"
          >
            Password
          </label>
          <input
            id="login__field-password"
            onKeyDown={this.onInput}
            placeholder="Password"
            ref={(ref) => (this.passwordInput = ref)}
            spellCheck={false}
            type="password"
          />

          <button
            id="login__login-button"
            className={submitClasses}
            disabled={!this.state.onLine}
            onClick={isCreatingAccount ? this.onSignUp : this.onLogin}
            type="submit"
          >
            {this.props.authPending ? (
              <Spinner isWhite={true} size={20} thickness={5} />
            ) : (
              buttonLabel
            )}
          </button>

          {!isCreatingAccount && (
            <a
              className="login__forgot"
              href="https://app.simplenote.com/forgot/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={this.onForgot}
            >
              Forgot your password?
            </a>
          )}
          {isElectron && !isCreatingAccount && (
            <Fragment>
              <span className="or">Or</span>
              <span className="or-line"></span>
              <button className="wpcc-button" onClick={this.onWPLogin}>
                {buttonLabel} with WordPress.com
              </button>
            </Fragment>
          )}
          {isCreatingAccount && (
            <div className="terms">
              By creating an account you agree to our
              <a
                href="https://simplenote.com/terms/"
                onClick={(event) => {
                  event.preventDefault();
                  viewExternalUrl('https://simplenote.com/terms/');
                }}
              >
                Terms of Service
              </a>
              .
            </div>
          )}
          <p className="login__signup">
            {helpMessage}{' '}
            <a href="#" onClick={this.toggleSignUp}>
              {helpLinkLabel}
            </a>
          </p>
        </form>
      </div>
    );
  }

  onInput = (event) => {
    if (event.type === 'keydown' && event.keyCode !== 13) {
      this.props.resetErrors();
      this.setState({
        passwordErrorMessage: '',
      });
      return;
    }
  };

  onLogin = (event) => {
    event.preventDefault();

    const username = get(this.usernameInput, 'value');
    const password = get(this.passwordInput, 'value');

    if (!(username && password)) {
      this.setState({
        passwordErrorMessage: 'Please fill out email and password.',
      });
      return;
    }

    if (password.length < 4) {
      this.setState({
        passwordErrorMessage: 'Passwords must contain at least 4 characters.',
      });
      return;
    }

    this.props.login(username, password);
  };

  onWPLogin = () => {
    const config = getConfig();
    this.setupAuthWindow();

    const redirectUrl = encodeURIComponent(config.wpcc_redirect_url);
    this.authState = `app-${cryptoRandomString(20)}`;
    const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${config.wpcc_client_id}&redirect_uri=${redirectUrl}&response_type=code&scope=global&state=${this.authState}`;

    this.authWindow.loadURL(authUrl);
    this.authWindow.show();
  };

  setupAuthWindow = () => {
    // eslint-disable-next-line no-undef
    const { BrowserWindow, session } = __non_webpack_require__(
      'electron'
    ).remote;

    this.authWindow = new BrowserWindow({
      width: 640,
      height: 640,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        session: session.fromPartition(`fresh-session-${Math.random()}`),
      },
    });

    this.authWindow.on('closed', () => {
      // make sure to release this from memory
      this.authWindow = null;
    });

    this.authWindow.webContents.session.protocol.registerHttpProtocol(
      'simplenote',
      (req, callback) => {
        const { searchParams } = new URL(req.url);

        // cancel the request by running callback() with no parameters
        // we're going to close the window and continue processing the
        // information we received in args of the simplenote://auth URL
        callback();

        const errorCode = searchParams.get('error')
          ? searchParams.get('code')
          : false;
        const authState = searchParams.get('state');
        const userEmail = searchParams.get('user');
        const simpToken = searchParams.get('token');
        const wpccToken = searchParams.get('wp_token');

        // Display an error message if authorization failed.
        switch (errorCode) {
          case false:
            break;
          case '1':
            return this.authError(
              'Please activate your WordPress.com account via email and try again.'
            );
          case '2':
            return this.authError(
              'Please confirm your account with the confirmation email before signing in to Simplenote.'
            );
          default:
            return this.authError('An error was encountered while signing in.');
        }

        this.closeAuthWindow();

        if (authState !== this.authState) {
          return;
        }

        this.props.tokenLogin(userEmail, simpToken);
      }
    );
  };

  authError = (errorMessage) => {
    this.closeAuthWindow();

    this.setState({
      passwordErrorMessage: errorMessage,
    });
  };

  closeAuthWindow = () => this.authWindow && this.authWindow.close();

  onForgot = (event) => {
    event.preventDefault();
    window.open(
      event.currentTarget.href,
      null,
      'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes'
    );
  };

  onSignUp = (event) => {
    event.preventDefault();

    const username = get(this.usernameInput, 'value');
    const password = get(this.passwordInput, 'value');

    if (!(username && password)) {
      this.setState({
        passwordErrorMessage: 'Please fill out email and password.',
      });
      return;
    }

    if (!validatePassword(password, username)) {
      this.setState({
        passwordErrorMessage:
          'Sorry, that password is not strong enough. Passwords must be at least 8 characters long and may not be the same as your email address.',
      });
      return;
    }

    this.props.signup(username, password, true);
    this.setState({ passwordErrorMessage: null });
  };

  toggleSignUp = (event) => {
    event.preventDefault();
    this.props.resetErrors();
    this.setState({
      passwordErrorMessage: '',
    });
    this.setState({ isCreatingAccount: !this.state.isCreatingAccount });
  };
}
