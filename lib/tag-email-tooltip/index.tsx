import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { showDialog } from '../state/ui/actions';

export const EmailToolTip = ({ openShareDialog }) => (
  <div className="tag-email-tooltip">
    <div className="tag-email-tooltip__arrow" />
    <div className="tag-email-tooltip__inside">
      Collaboration has moved. Press the Share icon in the toolbar to access
      the&nbsp;
      <a href="#" onClick={openShareDialog}>
        Collaborate screen
      </a>
      .
    </div>
  </div>
);

const mapDispatchToProps = dispatch => ({
  openShareDialog: () => dispatch(showDialog('SHARE')),
});

EmailToolTip.propTypes = {
  openShareDialog: PropTypes.func.isRequired,
};

export default connect(null, mapDispatchToProps)(EmailToolTip);
