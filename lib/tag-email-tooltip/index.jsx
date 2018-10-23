import React from 'react';
import { connect } from 'react-redux';

import appState from '../flux/app-state';

export const EmailToolTip = ({ openShareDialog }) => (
  <div className="tag-email-tooltip">
    <div className="tag-email-tooltip__arrow" />
    <div className="tag-email-tooltip__inside">
      Collaboration has moved. Press the Share icon in the toolbar to access
      the&nbsp;
      <a href="#" onClick={openShareDialog}>
        Collaborate screen
      </a>.
    </div>
  </div>
);

const mapDispatchToProps = dispatch => ({
  openShareDialog: () =>
    dispatch(
      appState.actionCreators.showDialog({
        dialog: {
          type: 'Share',
        },
      })
    ),
});

export default connect(null, mapDispatchToProps)(EmailToolTip);
