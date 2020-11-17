import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import type * as S from '../../state';
import type * as T from '../../types';

type OwnProps = {
  noteId: T.EntityId;
};

type StateProps = {
  lastUpdated?: number;
};

type Props = StateProps;

export const LastSyncTime: FunctionComponent<Props> = ({ lastUpdated }) =>
  'undefined' !== typeof lastUpdated ? (
    <time dateTime={new Date(lastUpdated).toISOString()}>
      {new Date(lastUpdated).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })}
    </time>
  ) : (
    <span />
  );

const mapStateToProps: S.MapState<StateProps, OwnProps> = (
  state,
  { noteId }
) => ({
  lastUpdated: state.simperium.lastSync.get(noteId),
});

export default connect(mapStateToProps)(LastSyncTime);
