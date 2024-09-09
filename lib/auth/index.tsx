import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import cryptoRandomString from '../utils/crypto-random-string';
import { get } from 'lodash';
import { isDev } from '../../desktop/env';
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
  hasTooManyRequests: boolean;
  hasUnverifiedAccount: boolean;
  login: (username: string, password: string) => any;
  loginRequested: boolean;
  isCompletingLogin: boolean;
  hasCodeError: boolean;
  requestLogin: (username: string) => any;
  completeLogin: (username: string, code: string) => any;
  requestSignup: (username: string) => any;
  resetErrors: () => any;
  tokenLogin: (username: string, token: string) => any;
};

type Props = OwnProps;

export class Auth extends Component<Props> {
  state = {
    authState: '',
    isCreatingAccount: false,
    passwordErrorMessage: null,
    onLine: window.navigator.onLine,
    usePassword: false,
    emailForPasswordForm: null,
  };

  componentDidMount() {
    window.addEventListener('online', this.setConnectivity, false);
    window.addEventListener('offline', this.setConnectivity, false);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.setConnectivity, false);
    window.removeEventListener('offline', this.setConnectivity, false);
  }

  componentDidUpdate() {
    // Add the email to the username/password form if it was set
    if (this.state.usePassword && this.state.emailForPasswordForm) {
      this.usernameInput.value = this.state.emailForPasswordForm;
      this.setState({ emailForPasswordForm: null });
      this.passwordInput.focus();
    }
  }

  setConnectivity = () => this.setState({ onLine: window.navigator.onLine });

  render() {
    // Don't render this component when running on the web
    if (config.is_app_engine) {
      return null;
    }

    const { isCreatingAccount, passwordErrorMessage, usePassword } = this.state;
    const submitClasses = classNames('button', 'button-primary', {
      pending: this.props.authPending,
    });

    const signUpText = 'Sign up';
    const logInText = 'Log in';
    const headerLabel = isCreatingAccount ? signUpText : logInText;
    const buttonLabel = isCreatingAccount
      ? signUpText
      : !isCreatingAccount && !usePassword
        ? 'Log in with email'
        : logInText;
    const wpccLabel =
      (isCreatingAccount ? signUpText : logInText) + ' with WordPress.com';
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
      'Could not log in with the provided credentials.'
    );

    const mainClasses = classNames('login', {
      'is-electron': isElectron,
    });

    if (this.props.accountCreationRequested) {
      return (
        <div className={mainClasses}>
          {isElectron && isMac && <div className="login__draggable-area" />}
          <div className="account-requested">
            <MailIcon />
            <p className="account-requested__message">
              We&apos;ve sent an email to{' '}
              <strong>{this.props.emailSentTo}</strong>. Please check your inbox
              and follow the instructions.
            </p>
            <p className="account-requested__footer">
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

    if (
      this.props.loginRequested ||
      this.props.isCompletingLogin ||
      this.props.hasCodeError
    ) {
      return (
        <div className={mainClasses}>
          {isElectron && isMac && <div className="login__draggable-area" />}
          <div className="account-requested">
            <form className="login__form" onSubmit={this.onSubmitCode}>
              <MailIcon />
              <p className="account-requested__message">
                We&apos;ve sent a code to{' '}
                <strong>{this.props.emailSentTo}</strong>. The code will be
                valid for a few minutes.
              </p>
              {(passwordErrorMessage || this.props.hasCodeError) && (
                <p className="login__auth-message is-error">
                  {passwordErrorMessage
                    ? passwordErrorMessage
                    : 'Could not log in. Check the code and try again.'}
                </p>
              )}
              <input
                type="text"
                className="account-requested__code"
                placeholder="Code"
                maxLength={6}
                autoFocus
                ref={(ref) => (this.codeInput = ref)}
              ></input>
              <button className="button button-primary" type="submit">
                {this.props.isCompletingLogin ? (
                  <Spinner isWhite={true} size={20} thickness={5} />
                ) : (
                  'Log in'
                )}
              </button>
              <Fragment>
                <div className="or-section">
                  <span className="or">Or</span>
                  <span className="or-line"></span>
                </div>
                <button
                  className="button button-secondary account-requested__password-button"
                  onClick={this.togglePassword}
                >
                  Enter password
                </button>
              </Fragment>
              <button
                onClick={this.clearRequestedAccount}
                className="button-borderless"
              >
                Go Back
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className={mainClasses}>
        {isElectron && isMac && <div className="login__draggable-area" />}
        <SimplenoteLogo />
        <form className="login__form" onSubmit={this.onSubmit}>
          <h1>{headerLabel}</h1>
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
              account at high risk of compromise. To protect your data,
              you&apos;ll need to
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
                update your password
              </a>{' '}
              before being able to log in again.
            </p>
          )}
          {this.props.hasTooManyRequests && (
            <p
              className="login__auth-message is-error"
              data-error-name="too-many-requests"
            >
              Too many login attempts. Try again later.
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
          <label className="login__field" htmlFor="login__field-username">
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
          {!isCreatingAccount && usePassword && (
            <>
              <label className="login__field" htmlFor="login__field-password">
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

          {!isCreatingAccount && !usePassword && (
            <Fragment>
              <div className="terms">
                We'll email you a code to log in, or you can
                <a
                  href="#"
                  rel="noopener noreferrer"
                  onClick={this.togglePassword}
                >
                  log in manually
                </a>
                .
              </div>
            </Fragment>
          )}

          {usePassword && (
            <Fragment>
              <a
                className="login__forgot"
                href="#"
                rel="noopener noreferrer"
                onClick={this.togglePassword}
              >
                Log in with email
              </a>
            </Fragment>
          )}

          {!isCreatingAccount && usePassword && (
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
                {wpccLabel}
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

  onSubmit = (event: React.FormEvent) => {
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
      (this.state.usePassword && this.passwordInput.validity.valueMissing)
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

    if (this.state.usePassword) {
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
      return;
    }

    // default: magic link login
    this.props.requestLogin(username);
  };

  onSubmitCode = (event: React.FormEvent) => {
    event.preventDefault();
    this.setState({ authState: 'login-requested' });
    this.setState({
      passwordErrorMessage: '',
    });

    const code = get(this.codeInput, 'value');
    const alphanumericRegex = /^[a-zA-Z0-9]{6}$/;
    if (!alphanumericRegex.test(code)) {
      this.setState({
        passwordErrorMessage: 'Code must be 6 characters.',
      });
      return;
    }

    const email = this.props.emailSentTo;

    this.props.completeLogin(email, code);
  };

  onWPLogin = () => {
    const redirectUrl = encodeURIComponent(config.wpcc_redirect_url);
    this.setState({ authState: `app-${cryptoRandomString(20)}` });
    const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${config.wpcc_client_id}&redirect_uri=${redirectUrl}&response_type=code&scope=global&state=${this.state.authState}`;

    window.electron.send('wpLogin', authUrl);

    window.electron.receive('wpLogin', (url: string) => {
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

      if (authState !== this.state.authState) {
        return;
      }
      this.props.tokenLogin(userEmail, simperiumToken);
    });
  };

  authError = (errorMessage: string) => {
    this.setState({
      passwordErrorMessage: errorMessage,
    });
  };

  onForgot = (event: React.MouseEvent) => {
    event.preventDefault();
    window.open(
      (event.currentTarget as HTMLAnchorElement).href,
      undefined,
      'width=640,innerWidth=640,height=480,innerHeight=480,useContentSize=true,chrome=yes,centerscreen=yes'
    );
  };

  toggleSignUp = (event: React.MouseEvent) => {
    event.preventDefault();
    this.props.resetErrors();
    this.setState({
      passwordErrorMessage: '',
    });
    this.setState({ isCreatingAccount: !this.state.isCreatingAccount });
  };
  togglePassword = (event: React.MouseEvent) => {
    event.preventDefault();
    this.props.resetErrors();
    this.setState({
      passwordErrorMessage: '',
      emailForPasswordForm: this.props.emailSentTo,
      usePassword: !this.state.usePassword,
    });
  };
}
