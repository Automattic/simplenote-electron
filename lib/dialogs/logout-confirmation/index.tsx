import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  continueAction: () => any;
};

type Props = DispatchProps;

const LogoutConfirmation = ({ continueAction }: Props) => (
  <UnsynchronizedConfirmation
    actionDescription="Logging out will delete any unsynchronized notes."
    actionName="Log out"
    actionSafeName="Safely log out"
    continueAction={continueAction}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  continueAction: actions.simperium.reallyLogOut,
};

export default connect(null, mapDispatchToProps)(LogoutConfirmation);
