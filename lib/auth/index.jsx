import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import cryptoRandomString from '../utils/crypto-random-string';
import { get } from 'lodash';
import getConfig from '../../get-config';
import Spinner from '../components/spinner';

import { hasInvalidCredentials, hasLoginError } from '../state/auth/selectors';
import { reset } from '../state/auth/actions';
import { setWPToken } from '../state/settings/actions';

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
    const errorMessage = isCreatingAccount
      ? 'Could not create account. Please try again.'
      : 'Could not sign in with the provided email address and password.';

    return (
      <div className="login">
        {isMacApp && <div className="login__draggable-area" />}
        <form className="login__form" onSubmit={this.onLogin}>
          <h1>{buttonLabel}</h1>

          {this.props.hasInvalidCredentials && (
            <p className="login__auth-message is-error">
              Could not sign in with the provided email address and password.
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

          <a
            className="login__forgot"
            href="https://app.simplenote.com/forgot/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={this.onForgot}
          >
            Forgot your password?
          </a>

          <p className="login__signup">
            <a href="#" onClick={this.toggleSignUp}>
              {helpLinkLabel}
            </a>
          </p>
          {isElectron && (
            <Fragment>
              <span className="or">Or</span>
              <span className="or-line"></span>
              <button className="wpcc-button" onClick={this.onWPLogin}>
                Log in with WordPress.com
              </button>
            </Fragment>
          )}
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
    const remote = __non_webpack_require__('electron').remote; // eslint-disable-line no-undef
    const BrowserWindow = remote.BrowserWindow;
    const protocol = remote.protocol;
    this.authWindow = new BrowserWindow({
      width: 640,
      height: 640,
      show: false,
      webPreferences: {
        nodeIntegration: false,
      },
    });

    // Register simplenote:// protocol
    protocol.registerHttpProtocol('simplenote', req => {
      this.authWindow.loadURL(req.url);
    });

    this.authWindow.webContents.on('will-navigate', (event, url) =>
      this.onBrowserNavigate(url)
    );

    this.authWindow.webContents.on(
      'did-get-redirect-request',
      (event, oldUrl, newUrl) => this.onBrowserNavigate(newUrl)
    );
  };

  onBrowserNavigate = url => {
    try {
      this.authenticateWithUrl(new URL(url));
    } catch (error) {
      // Do nothing if Url was invalid
    }
  };

  authenticateWithUrl = url => {
    // Bail out if the url is not the simplenote protocol
    if (url.protocol !== 'simplenote:') {
      return;
    }

    const { authorizeUserWithToken, saveWPToken } = this.props;
    const params = url.searchParams;

    // Display an error message if authorization failed.
    if (params.get('error')) {
      switch (params.get('code')) {
        case '1':
          return this.authError(
            'Please activate your WordPress.com account via email and try again.'
          );
        default:
          return this.authError('An error was encountered while signing in.');
      }
    }

    const userEmail = params.get('user');
    const spToken = params.get('token');
    const state = params.get('state');

    // Sanity check on params
    if (!(spToken && userEmail && state)) {
      return this.closeAuthWindow();
    }

    // Verify that the state strings match
    if (state !== this.authState) {
      return;
    }

    authorizeUserWithToken(userEmail, spToken);

    const wpToken = params.get('wp_token');
    if (wpToken) {
      saveWPToken(wpToken);
    }

    this.closeAuthWindow();
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Auth);
