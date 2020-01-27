import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import cryptoRandomString from '../utils/crypto-random-string';
import { get } from 'lodash';
import getConfig from '../../get-config';
import SimplenoteLogo from '../icons/simplenote';
import Spinner from '../components/spinner';

import { hasInvalidCredentials, hasLoginError } from '../state/auth/selectors';
import { reset } from '../state/auth/actions';
import { setWPToken } from '../state/settings/actions';
import { viewExternalUrl } from '../utils/url-utils';

export class Auth extends Component {
  static propTypes = {
    authorizeUserWithToken: PropTypes.func.isRequired,
    authPending: PropTypes.bool,
    hasInvalidCredentials: PropTypes.bool,
    hasLoginError: PropTypes.bool,
    isAuthenticated: PropTypes.bool,
    isElectron: PropTypes.bool,
    isMacApp: PropTypes.bool,
    onAuthenticate: PropTypes.func.isRequired,
    onCreateUser: PropTypes.func.isRequired,
    resetErrors: PropTypes.func.isRequired,
    saveWPToken: PropTypes.func.isRequired,
  };

  state = {
    isCreatingAccount: false,
    passwordErrorMessage: null,
  };

  componentDidMount() {
    if (this.usernameInput) {
      this.usernameInput.focus();
    }
  }

  render() {
    // Don't render this component when running on the web
    const config = getConfig();
    if (config.is_app_engine) {
      return null;
    }

    const { isMacApp, isElectron } = this.props;
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
        {isMacApp && <div className="login__draggable-area" />}
        <SimplenoteLogo />
        <form className="login__form" onSubmit={this.onLogin}>
          <h1>{buttonLabel}</h1>

          {this.props.hasInvalidCredentials && (
            <p className="login__auth-message is-error">
              Could not log in with the provided email address and password.
            </p>
          )}
          {this.props.hasLoginError && (
            <p className="login__auth-message is-error">{errorMessage}</p>
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
            ref={ref => (this.usernameInput = ref)}
            spellCheck={false}
            type="email"
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
            ref={ref => (this.passwordInput = ref)}
            spellCheck={false}
            type="password"
          />

          <button
            id="login__login-button"
            className={submitClasses}
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
                onClick={event => {
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

  onInput = event => {
    if (event.type === 'keydown' && event.keyCode !== 13) {
      this.props.resetErrors();
      this.setState({
        passwordErrorMessage: '',
      });
      return;
    }
  };

  onLogin = event => {
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

    this.props.onAuthenticate(username, password);
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

        const { authorizeUserWithToken, saveWPToken } = this.props;
        authorizeUserWithToken(userEmail, simpToken);
        if (wpccToken) {
          saveWPToken(wpccToken);
        }
      }
    );
  };

  authError = errorMessage => {
    this.closeAuthWindow();

    this.setState({
      passwordErrorMessage: errorMessage,
    });
  };

  closeAuthWindow = () => this.authWindow && this.authWindow.close();

  onForgot = event => {
    event.preventDefault();
    window.open(
      event.currentTarget.href,
      null,
      'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes'
    );
  };

  onSignUp = event => {
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

    this.props.onCreateUser(username, password);
    this.setState({ passwordErrorMessage: null });
  };

  toggleSignUp = event => {
    event.preventDefault();
    this.props.resetErrors();
    this.setState({
      passwordErrorMessage: '',
    });
    this.setState({ isCreatingAccount: !this.state.isCreatingAccount });
  };
}

const mapDispatchToProps = dispatch => ({
  resetErrors: () => dispatch(reset()),
  saveWPToken: token => dispatch(setWPToken(token)),
});

const mapStateToProps = state => ({
  hasInvalidCredentials: hasInvalidCredentials(state),
  hasLoginError: hasLoginError(state),
});

export default connect(mapStateToProps, mapDispatchToProps)(Auth);
