import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  connectionStatus: T.ConnectionState;
};

type Props = StateProps;

export const ConnectionStatus: FunctionComponent<Props> = ({
  connectionStatus,
}) => (
  <div>
    {connectionStatus === 'green'
      ? '🟢'
      : connectionStatus === 'yellow'
      ? '🟡'
      : connectionStatus === 'red'
      ? '🔴'
      : '⛔️'}
  </div>
);

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  connectionStatus: state.simperium.connectionStatus,
});

export default connect(mapStateToProps)(ConnectionStatus);
