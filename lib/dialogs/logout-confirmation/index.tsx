import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  action: () => any;
};

type Props = DispatchProps;

const LogoutConfirmation = ({ action }: Props) => (
  <UnsynchronizedConfirmation
    description="Logging out will delete any unsynchronized notes."
    unsafeAction="Log out"
    safeAction="Safely log out"
    action={action}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  action: actions.simperium.reallyLogOut,
};

export default connect(null, mapDispatchToProps)(LogoutConfirmation);
