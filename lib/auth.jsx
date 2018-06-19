import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { get } from 'lodash';
import getConfig from '../get-config';
import SimplenoteLogo from './icons/simplenote';
import Spinner from './components/spinner';
import WordPressLogo from './icons/wordpress';

import { hasInvalidCredentials, hasLoginError } from './state/auth/selectors';

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
        {isMacApp && <div className="login-draggable-area" />}
        <form className="login-form" onSubmit={this.onLogin}>
          <div className="login-logo">
            <SimplenoteLogo />
          </div>
          {isElectron && (
            <div className="wpcom-connect">
              <div
                className="button button-primary wpcom-connect-button"
                onClick={this.onWPLogin}
              >
                <WordPressLogo />
                Sign in with WordPress.com
              </div>
              <div className="wpcom-connect-or">or:</div>
            </div>
          )}
          <div className="login-fields theme-color-border theme-color-fg">
            <label
              className="login-field theme-color-border"
              htmlFor="login-field-username"
            >
              <span className="login-field-label">Email</span>
              <span className="login-field-control">
                <input
                  ref={ref => (this.usernameInput = ref)}
                  id="login-field-username"
                  type="email"
                  onKeyDown={this.onLogin}
                />
              </span>
            </label>
            <label
              className="login-field theme-color-border"
              htmlFor="login-field-password"
            >
              <span className="login-field-label">Password</span>
              <span className="login-field-control">
                <input
                  ref={ref => (this.passwordInput = ref)}
                  id="login-field-password"
                  type="password"
                  onKeyDown={this.onLogin}
                />
              </span>
            </label>
            {isCreatingAccount && (
              <label
                className="login-field theme-color-border"
                htmlFor="login-field-password-confirm"
              >
                <span className="login-field-label">Confirm Password</span>
                <span className="login-field-control">
                  <input
                    ref={ref => (this.passwordConfirmInput = ref)}
                    id="login-field-password-confirm"
                    type="password"
                    onKeyDown={this.onSignUp}
                  />
                </span>
              </label>
            )}
          </div>
          {this.props.hasInvalidCredentials && (
            <p className="login-auth-message login-auth-failure">
              The credentials you entered don&apos;t match
            </p>
          )}
          {this.props.hasLoginError && (
            <p className="login-auth-message login-auth-failure">
              {errorMessage}
            </p>
          )}
          {passwordErrorMessage && (
            <p className="login-auth-message login-auth-failure">
              {passwordErrorMessage}
            </p>
          )}
          <div className="login-actions">
            <div
              className={submitClasses}
              onClick={isCreatingAccount ? this.onSignUp : this.onLogin}
              type="submit"
            >
              {this.props.authPending ? <Spinner /> : buttonLabel}
            </div>
            <p className="login-forgot">
              <a
                href="https://app.simplenote.com/forgot/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={this.onForgot}
              >
                Forgot your password?
              </a>
            </p>
            <p className="login-signup">
              {helpMessage}{' '}
              <a href="#" onClick={this.toggleSignUp}>
                {helpLinkLabel}
              </a>
            </p>
          </div>
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
    const ipcRenderer = __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef

    ipcRenderer.on('wpAuthError', (event, payload) => {
      this.onAuthError(payload.message);
    });

    const config = getConfig();
    const redirectUrl = encodeURIComponent(config.wpcc_redirect_url);
    const clientId = config.wpcc_client_id;

    ipcRenderer.send('startWPAuth', {
      redirectUrl,
      clientId,
    });
  };

  onAuthError = errorMessage => {
    this.setState({
      passwordErrorMessage: errorMessage,
    });
  };

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

const mapStateToProps = state => ({
  hasInvalidCredentials: hasInvalidCredentials(state),
  hasLoginError: hasLoginError(state),
});

export default connect(mapStateToProps)(Auth);
