import React from 'react';
import { connect } from 'react-redux';

import appState from './flux/app-state';

export const EmailToolTip = ({ openShareDialog }) => (
  <div className="tag-email-tooltip">
    <div className="tag-email-tooltip__arrow" />
    <div className="tag-email-tooltip__inside">
      Sharing notes is now accessed through the collaboration tab in the{' '}
      <a href="#" onClick={openShareDialog}>
        sharing page
      </a>. You will find all email address tags in that list instead.
    </div>
  </div>
);

const mapDispatchToProps = (dispatch, { note }) => ({
  openShareDialog: () =>
    dispatch(
      appState.actionCreators.showDialog({
        dialog: {
          type: 'Share',
          modal: true,
        },
        params: { note },
      })
    ),
});

export default connect(null, mapDispatchToProps)(EmailToolTip);
