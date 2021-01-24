import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  reallyCloseWindow: () => any;
};

type Props = DispatchProps;

const CloseWindowConfirmation = ({ reallyCloseWindow }: Props) => (
  <UnsynchronizedConfirmation
    description="Closing the app with unsynchronized notes could cause data loss."
    unsafeAction="Close anyway"
    safeAction="Safely close app"
    action={reallyCloseWindow}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  reallyCloseWindow: actions.electron.reallyCloseWindow,
};

export default connect(null, mapDispatchToProps)(CloseWindowConfirmation);
