import React, { FunctionComponent } from 'react';
import classNames from 'classnames';
import Modal from 'react-modal';
import { connect } from 'react-redux';

import CrossIcon from '../icons/cross';
import WarningIcon from '../icons/warning';

import actions from '../state/actions';

import * as selectors from '../state/selectors';
import * as S from '../state';

type StateProps = {
  alternateLoginEmail: string | null;
  email: string | null;
  theme: 'light' | 'dark';
};

type DispatchProps = {
  logout: () => any;
  dismiss: () => any;
};

type Props = StateProps & DispatchProps;

const AlternateLoginPrompt: FunctionComponent<Props> = ({
  alternateLoginEmail,
  dismiss,
  email,
  logout,
  theme,
}) => {
  const displayClose = (
    <div className="alternate-login__dismiss">
      <button
        className="icon-button"
        aria-label="Close dialog"
        onClick={dismiss}
      >
        <CrossIcon />
      </button>
    </div>
  );

  const displayAlternateLoginPrompt = (
    <>
      {displayClose}
      <span>
        <WarningIcon />
      </span>
      <h2>Logout?</h2>
      <p>You are already logged in as:</p>
      <p className="alternate-login__email">
        <strong>{email}</strong>
      </p>
      <p>You tried logging in with:</p>
      <p className="alternate-login__email">
        <strong>{alternateLoginEmail}</strong>
      </p>
      <p>Would you like to log out?</p>

      <div className="alternate-login__button-row button-borderless">
        <a target="_blank" rel="noreferrer" onClick={dismiss}>
          <button className="button button-borderless">Cancel</button>
        </a>
        <a target="_blank" rel="noreferrer" onClick={logout}>
          <button className="button button-primary">Logout</button>
        </a>
      </div>
    </>
  );

  return (
    <Modal
      key="alternate-login"
      className="alternate-login__modal"
      isOpen
      onRequestClose={dismiss}
      contentLabel="Log out?"
      overlayClassName="alternate-login__overlay"
      portalClassName={classNames('alternate-login__portal')}
    >
      {displayAlternateLoginPrompt}
    </Modal>
  );
};

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  dismiss: () => actions.ui.showAlternateLoginPrompt(false),
  logout: actions.ui.logout,
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  alternateLoginEmail: state.ui.alternateLoginEmail,
  email: state.settings.accountName,
  theme: selectors.getTheme(state),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AlternateLoginPrompt);
