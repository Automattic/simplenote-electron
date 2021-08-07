import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import cryptoRandomString from '../utils/crypto-random-string';
import { get } from 'lodash';
import getConfig from '../../get-config';
import MailIcon from '../icons/mail';
import SimplenoteLogo from '../icons/simplenote';
import Spinner from '../components/spinner';
import { isElectron, isMac } from '../utils/platform';
import { viewExternalUrl } from '../utils/url-utils';

type OwnProps = {
  accountCreationRequested: boolean;
  authPending: boolean;
  emailSentTo: string;
  hasCompromisedPassword: boolean;
  hasInsecurePassword: boolean;
  hasInvalidCredentials: boolean;
  hasLoginError: boolean;
  hasUnverifiedAccount: boolean;
  login: (username: string, password: string) => any;
  requestSignup: (username: string) => any;
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

    const errorMessage = isCreatingAccount ? (
      <>
        Could not request account creation. Please try again or
        <a
          href="mailto:support@simplenote.com?subject=Simplenote%20Support"
          onClick={(event) => {
            event.preventDefault();
            viewExternalUrl(
              'mailto:support@simplenote.com?subject=Simplenote%20Support'
            );
          }}
        >
          contact us
        </a>
        .
      </>
    ) : (
      'Could not log in with the provided email address and password.'
    );

    const mainClasses = classNames('login', {
      'is-electron': isElectron,
    });

    if (this.props.accountCreationRequested) {
      return (
        <div className={mainClasses}>
          {isElectron && isMac && <div className="login__draggable-area" />}
          <div className="accountRequested">
            <MailIcon />
            <p className="accountRequested__message theme-color-fg">
              We&apos;ve sent an email to{' '}
              <strong>{this.props.emailSentTo}</strong>. Please check your inbox
              and follow the instructions.
            </p>
            <p className="accountRequested__footer theme-color-fg-dim">
              Didn&apos;t get an email? You may already have an account
              associated with this email address. Contact{' '}
              <a
                onClick={(event) => {
                  event.preventDefault();
                  viewExternalUrl('mailto:support@simplenote.com');
                }}
                href="mailto:support@simplenote.com"
              >
                support@simplenote.com
              </a>{' '}
              for help.
            </p>
            <button
              onClick={this.clearRequestedAccount}
              className="button-borderless"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={mainClasses}>
        {isElectron && isMac && <div className="login__draggable-area" />}
        <SimplenoteLogo />
        <form className="login__form" onSubmit={this.onSubmit}>
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
          {this.props.hasUnverifiedAccount && (
            <p
              className="login__auth-message is-error"
              data-error-name="verification-required"
            >
              Account verification required. You must verify your email before
              logging in to your account.
              <a
                className="login__reset"
                href={
                  'https://app.simplenote.com/account/verify-email/' +
                  btoa(get(this.usernameInput, 'value'))
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={this.onForgot}
              >
                Send Verification Email
              </a>{' '}
            </p>
          )}
          {this.props.hasCompromisedPassword && (
            <p
              className="login__auth-message is-error"
              data-error-name="compromised-password"
            >
              This password has appeared in a data breach, which puts your
              account at high risk of compromise. Please
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
              </a>{' '}
              your password.
            </p>
          )}
          {(this.props.hasInvalidCredentials || this.props.hasLoginError) && (
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
            onInput={this.onInput}
            onInvalid={this.onInput}
            onFocus={this.onFocus}
            onBlur={this.onBlur}
            placeholder="Email"
            ref={(ref) => (this.usernameInput = ref)}
            spellCheck={false}
            type="email"
            required
            autoFocus
          />
          {!isCreatingAccount && (
            <>
              <label
                className="login__field theme-color-border"
                htmlFor="login__field-password"
              >
                Password
              </label>
              <input
                id="login__field-password"
                onInput={this.onInput}
                onInvalid={this.onInput}
                onFocus={this.onFocus}
                onBlur={this.onBlur}
                placeholder="Password"
                ref={(ref) => (this.passwordInput = ref)}
                spellCheck={false}
                type="password"
                required
                minLength={4}
              />
            </>
          )}
          <button
            id="login__login-button"
            className={submitClasses}
            disabled={!this.state.onLine}
            onClick={this.onSubmit}
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

  onBlur = (event) => {
    // nothing has been entered yet, don't validate
    if (
      event.currentTarget.value === '' &&
      !event.currentTarget.getAttribute('data-touched')
    ) {
      return;
    }

    // a value has been entered, validate from now on
    event.currentTarget.className = 'validate';
  };

  onFocus = (event) => {
    // nothing has been entered yet, don't validate
    if (!event.currentTarget.getAttribute('data-touched')) {
      return;
    }

    // if the input is valid when focused, don't validate on each keystroke
    if (event.currentTarget.validity.valid) {
      event.currentTarget.className = '';
    } else {
      event.currentTarget.className = 'validate';
    }
  };

  onInput = (event) => {
    // don't be annoying about red borders during input:
    // - don't start checking validity until field has been changed
    // - after invalid, check at every input to see if it becomes valid
    // see https://developer.mozilla.org/en-US/docs/Web/CSS/:-moz-ui-invalid

    // monitor when the field has been changed by the user
    if (event.currentTarget.value !== '') {
      event.currentTarget.setAttribute('data-touched', true);
    }

    // we're using a className for validation so we can style in Electron
    if (event.currentTarget.className !== 'validate') {
      return;
    }
  };

  clearRequestedAccount = () => {
    this.props.resetErrors();
  };

  onSubmit = (event) => {
    event.preventDefault();

    // clear any existing error messages on submit
    this.props.resetErrors();
    this.setState({
      passwordErrorMessage: '',
    });

    // make sure all existing form fields are filled out
    if (!this.passwordInput) {
      if (this.usernameInput.validity.valueMissing) {
        this.setState({
          passwordErrorMessage: 'Please fill out email.',
        });
        return;
      }
    } else if (
      this.usernameInput.validity.valueMissing ||
      this.passwordInput.validity.valueMissing
    ) {
      this.setState({
        passwordErrorMessage: 'Please fill out email and password.',
      });
      return;
    }

    // check that email is valid
    if (!this.usernameInput.validity.valid) {
      this.setState({
        passwordErrorMessage: 'Please enter a valid email address.',
      });
      return;
    }

    const username = get(this.usernameInput, 'value');

    if (this.state.isCreatingAccount) {
      this.props.requestSignup(username);
      return;
    }

    const password = get(this.passwordInput, 'value');

    // login has slightly more relaxed password rules
    if (!this.passwordInput.validity.valid) {
      this.setState({
        passwordErrorMessage: 'Passwords must contain at least 4 characters.',
      });
      return;
    }

    this.setState({ passwordErrorMessage: null });
    this.props.login(username, password);
  };

  onWPLogin = () => {
    const config = getConfig();
    const redirectUrl = encodeURIComponent(config.wpcc_redirect_url);
    this.authState = `app-${cryptoRandomString(20)}`;
    const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${config.wpcc_client_id}&redirect_uri=${redirectUrl}&response_type=code&scope=global&state=${this.authState}`;

    window.electron.send('wpLogin', authUrl);

    window.electron.receive('wpLogin', (url) => {
      const { searchParams } = new URL(url);

      const errorCode = searchParams.get('error')
        ? searchParams.get('code')
        : false;
      const authState = searchParams.get('state');
      const userEmail = searchParams.get('user');
      const simperiumToken = searchParams.get('token');
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

      if (authState !== this.authState) {
        return;
      }
      this.props.tokenLogin(userEmail, simperiumToken);
    });
  };

  authError = (errorMessage) => {
    this.setState({
      passwordErrorMessage: errorMessage,
    });
  };

  onForgot = (event) => {
    event.preventDefault();
    window.open(
      event.currentTarget.href,
      null,
      'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes'
    );
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
