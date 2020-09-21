import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { Tooltip } from '@material-ui/core';
import i18n from 'i18n-calypso';
import ConnectionIcon from '../icons/connection';
import NoConnectionIcon from '../icons/no-connection';

import * as S from '../state';
import * as T from '../types';

import './style';

type StateProps = {
  connectionStatus: T.ConnectionState;
};

type Props = StateProps;

export const ConnectionStatus: FunctionComponent<Props> = ({
  connectionStatus,
}) => (
  <div className="navigation-bar__footer-item theme-color-fg-dim">
    <Tooltip
      enterDelay={200}
      classes={{ tooltip: 'icon-button__tooltip' }}
      title={
        connectionStatus === 'green'
          ? i18n.translate('Simplenote is communicating with the server.')
          : connectionStatus === 'offline'
          ? i18n.translate(
              "Simplenote is operating in offline mode and changes won't be synchronized with the server until it connects again."
            )
          : i18n.translate(
              "Simplenote hasn't communicated with the server in a while; changes may not be synchronized with the server until the connection improves."
            )
      }
    >
      <p>
        {connectionStatus === 'green' ? (
          <ConnectionIcon />
        ) : (
          <NoConnectionIcon />
        )}
        <span className="server-connection__label">
          {i18n.translate('Server connection')}
        </span>
      </p>
    </Tooltip>
  </div>
);

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  connectionStatus: state.simperium.connectionStatus,
});

export default connect(mapStateToProps)(ConnectionStatus);
