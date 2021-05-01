import React, { Fragment, FunctionComponent, useState, useEffect } from 'react';
import classNames from 'classnames';
import Modal from 'react-modal';
import { connect } from 'react-redux';

import CrossIcon from '../icons/cross';
import MailIcon from '../icons/mail';
import WarningIcon from '../icons/warning';

import actions from '../state/actions';
import * as selectors from '../state/selectors';
import { recordEvent } from '../state/analytics/middleware';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  accountVerification: T.VerificationState;
  email: string | null;
  theme: string;
};

type DispatchProps = {
  dismiss: () => any;
};

type Props = StateProps & DispatchProps;

const EmailVerification: FunctionComponent<Props> = ({
  accountVerification,
  dismiss,
  email,
  theme,
}) => {
  const base64EncodedEmail = btoa(email || '');
  const sendVerifyUrl: string = `https://app.simplenote.com/account/verify-email/${base64EncodedEmail}`;

  if (accountVerification === 'pending') {
    recordEvent('verification_verify_screen_viewed');
  } else {
    recordEvent('verification_review_screen_viewed');
  }

  const displayClose = (
    <div className="email-verification__dismiss">
      <button
        className="icon-button"
        aria-label="Close dialog"
        onClick={dismiss}
      >
        <CrossIcon />
      </button>
    </div>
  );

  const displayEmailConfirm = (
    <Fragment>
      {displayClose}
      <span className="theme-color-fg-dim">
        <WarningIcon />
      </span>
      <h2>Review Your Account</h2>
      <p>You are registered with Simplenote using the email:</p>
      <p className="email-verification__email">
        <strong>{email}</strong>
      </p>
      <p>
        Improvements to account security may result in account loss if you no
        longer have access to this email address.
      </p>

      <div className="email-verification__button-row button-borderless">
        <a
          target="_blank"
          rel="noreferrer"
          href="https://app.simplenote.com/settings"
          onClick={() => recordEvent('verification_change_email_button_tapped')}
        >
          <button className="button button-borderless">Change Email</button>
        </a>
        <a
          target="_blank"
          rel="noreferrer"
          href={sendVerifyUrl}
          onClick={() => recordEvent('verification_confirm_button_tapped')}
        >
          <button className="button button-primary">Confirm</button>
        </a>
      </div>
    </Fragment>
  );

  const displayEmailRequested = (
    <Fragment>
      {displayClose}
      <span className="theme-color-fg-dim">
        <MailIcon />
      </span>
      <h2>Verify Your Email</h2>
      <p>
        We’ve sent a verification email to <strong>{email}</strong>.
      </p>
      <p>Please check your inbox and follow the instructions.</p>

      <div className="email-verification__button-row">
        <a
          target="_blank"
          rel="noreferrer"
          href={sendVerifyUrl}
          onClick={() => recordEvent('verification_resend_email_button_tapped')}
        >
          <button className="button button-borderless">Resend Email</button>
        </a>
      </div>
    </Fragment>
  );
  return (
    <Modal
      key="email-verification"
      className="email-verification__modal theme-color-fg theme-color-bg"
      isOpen
      onRequestClose={dismiss}
      contentLabel="Confirm your email"
      overlayClassName="email-verification__overlay"
      portalClassName={classNames('email-verification__portal')}
    >
      {accountVerification === 'pending'
        ? displayEmailRequested
        : displayEmailConfirm}
    </Modal>
  );
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  dismiss: () => actions.ui.dismissEmailVerifyDialog(),
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  accountVerification: state.data.accountVerification,
  email: state.settings.accountName,
  theme: selectors.getTheme(state),
});

export default connect(mapStateToProps, mapDispatchToProps)(EmailVerification);
