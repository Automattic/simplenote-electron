import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  reallyLogOut: () => any;
};

type Props = DispatchProps;

const LogoutConfirmation = ({ reallyLogOut }: Props) => (
  <UnsynchronizedConfirmation
    description="Logging out will delete any unsynchronized notes."
    unsafeAction="Log out"
    safeAction="Safely log out"
    action={reallyLogOut}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  reallyLogOut: actions.ui.reallyLogOut,
};

export default connect(null, mapDispatchToProps)(LogoutConfirmation);
