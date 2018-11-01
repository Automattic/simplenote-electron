import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import cryptoRandomString from 'crypto-random-string';
import { get } from 'lodash';
import getConfig from '../../get-config';
import SimplenoteLogo from '../icons/simplenote';
import Spinner from '../components/spinner';
import WordPressLogo from '../icons/wordpress';

import { hasInvalidCredentials, hasLoginError } from '../state/auth/selectors';
import { setWPToken } from '../state/settings/actions';

export class Auth extends Component {
  static propTypes = {
    isAuthenticated: PropTypes.bool,
    isMacApp: PropTypes.bool,
    isElectron: PropTypes.bool,
    onAuthenticate: PropTypes.func.isRequired,
    onCreateUser: PropTypes.func.isRequired,
    authorizeUserWithToken: PropTypes.func.isRequired,
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
      : 'Login failed. Please try again.';

    return (
      <div className="login">
        {isMacApp && <div className="login__draggable-area" />}
        <form className="login__form" onSubmit={this.onLogin}>
          <div className="login__logo">
            <SimplenoteLogo />
          </div>
          <div className="login__fields theme-color-border theme-color-fg">
            <label
              className="login__field theme-color-border"
              htmlFor="login__field-username"
            >
              <span className="login__field-label">Email</span>
              <span className="login__field-control">
                <input
                  ref={ref => (this.usernameInput = ref)}
                  id="login__field-username"
                  type="email"
                  onKeyDown={this.onLogin}
                  spellCheck={false}
                />
              </span>
            </label>
            <label
              className="login__field theme-color-border"
              htmlFor="login__field-password"
            >
              <span className="login__field-label">Password</span>
              <span className="login__field-control">
                <input
                  ref={ref => (this.passwordInput = ref)}
                  id="login__field-password"
                  type="password"
                  onKeyDown={this.onLogin}
                  spellCheck={false}
                />
              </span>
            </label>
            {isCreatingAccount && (
              <label
                className="login__field theme-color-border"
                htmlFor="login__field-password-confirm"
              >
                <span className="login__field-label">Confirm Password</span>
                <span className="login__field-control">
                  <input
                    ref={ref => (this.passwordConfirmInput = ref)}
                    id="login__field-password-confirm"
                    type="password"
                    onKeyDown={this.onSignUp}
                    spellCheck={false}
                  />
                </span>
              </label>
            )}
          </div>
          {this.props.hasInvalidCredentials && (
            <p className="login__auth-message is-error">
              The credentials you entered don&apos;t match
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
          <div className="login__actions">
            <button
              className={submitClasses}
              onClick={isCreatingAccount ? this.onSignUp : this.onLogin}
              type="submit"
            >
              {this.props.authPending ? <Spinner /> : buttonLabel}
            </button>
            <p className="login__forgot">
              <a
                href="https://app.simplenote.com/forgot/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={this.onForgot}
              >
                Forgot your password?
              </a>
            </p>
            <p className="login__signup">
              {helpMessage}{' '}
              <a href="#" onClick={this.toggleSignUp}>
                {helpLinkLabel}
              </a>
            </p>
          </div>
          {isElectron && (
            <Fragment>
              <div className="login__or">or:</div>
              <div className="login__btn-wpcom">
                <button
                  className="button button-borderless"
                  onClick={this.onWPLogin}
                >
                  <span className="login__btn-wpcom-icon">
                    <WordPressLogo />
                  </span>
                  Log in with WordPress.com
                </button>
              </div>
            </Fragment>
          )}
        </form>
      </div>
    );
  }

  onLogin = event => {
    if (event.type === 'keydown' && event.keyCode !== 13) {
      return;
    }
    event.preventDefault();

    const username = get(this.usernameInput, 'value');
    const password = get(this.passwordInput, 'value');

    if (!(username && password)) {
      return;
    }

    this.props.onAuthenticate(username, password);
  };

  onWPLogin = () => {
    const config = getConfig();
    this.setupAuthWindow();

    const redirectUrl = encodeURIComponent(config.wpcc_redirect_url);
    this.authState = `app-${cryptoRandomString(20)}`;
    const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${
      config.wpcc_client_id
    }&redirect_uri=${redirectUrl}&response_type=code&scope=global&state=${
      this.authState
    }`;

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
    if (event.type === 'keydown' && event.keyCode !== 13) {
      return;
    }
    event.preventDefault();

    const username = get(this.usernameInput, 'value');
    const password = get(this.passwordInput, 'value');
    const passwordConfirm = get(this.passwordConfirmInput, 'value');

    if (!(username && password && passwordConfirm)) {
      return;
    }

    if (password !== passwordConfirm) {
      this.setState({ passwordErrorMessage: "The passwords don't match." });
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
  saveWPToken: token => dispatch(setWPToken(token)),
});

const mapStateToProps = state => ({
  hasInvalidCredentials: hasInvalidCredentials(state),
  hasLoginError: hasLoginError(state),
});

export default connect(mapStateToProps, mapDispatchToProps)(Auth);
