import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  action: () => any;
};

type Props = DispatchProps;

const CloseWindowConfirmation = ({ action }: Props) => (
  <UnsynchronizedConfirmation
    description="Closing the app with unsynchronized notes could cause data loss."
    unsafeAction="Close window"
    safeAction="Safely close window"
    action={action}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  action: actions.electron.reallyCloseWindow,
};

export default connect(null, mapDispatchToProps)(CloseWindowConfirmation);
