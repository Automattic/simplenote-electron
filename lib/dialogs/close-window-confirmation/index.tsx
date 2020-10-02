import React from 'react';
import { connect } from 'react-redux';

import actions from '../../state/actions';
import UnsynchronizedConfirmation from '../unsynchronized';

import type * as S from '../../state';

type DispatchProps = {
  continueAction: () => any;
};

type Props = DispatchProps;

const CloseWindowConfirmation = ({ continueAction }: Props) => (
  <UnsynchronizedConfirmation
    actionDescription="Closing the app with unsynchronized notes could cause data loss."
    actionName="Close window"
    actionSafeName="Safely close window"
    continueAction={continueAction}
  />
);

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  continueAction: actions.electron.reallyCloseWindow,
};

export default connect(null, mapDispatchToProps)(CloseWindowConfirmation);
