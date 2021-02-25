import React, { Fragment, FunctionComponent } from 'react';
import classNames from 'classnames';
import Modal from 'react-modal';
import { connect } from 'react-redux';

import CrossIcon from '../icons/cross';
import WarningIcon from '../icons/warning';

import actions from '../state/actions';

import * as S from '../state';

type StateProps = {
  showLogout: string;
  email: string | null;
};

type DispatchProps = {
  dismiss: () => any;
};

type Props = StateProps & DispatchProps;

const TokenLoginLogout: FunctionComponent<Props> = ({
  showLogout,
  dismiss,
  email,
}) => {
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
      <h2>Logout?</h2>
      <p>
        You are logged in with <strong>{email}</strong>.
      </p>
      <p>You tried logging in with {showLogout}. Would you like to logout?</p>

      <div className="email-verification__button-row button-borderless">
        <a target="_blank" rel="noreferrer">
          <button className="button button-borderless">Cancel</button>
        </a>
        <a target="_blank" rel="noreferrer">
          <button className="button button-primary">Logout</button>
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
      portalClassName={classNames(
        'email-verification__portal',
        'theme-' + theme
      )}
    >
      {displayEmailConfirm}
    </Modal>
  );
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  dismiss: () => actions.ui.hideTokenLoginLogout(),
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  showLogout: state.ui.showTokenLoginLogout,
  email: state.settings.accountName,
});

export default connect(mapStateToProps, mapDispatchToProps)(TokenLoginLogout);
