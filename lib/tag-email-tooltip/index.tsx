import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

import { showDialog } from '../state/ui/actions';

import * as S from '../state';

type DispatchProps = {
  openShareDialog: () => any;
};

type Props = DispatchProps;

export const EmailToolTip: FunctionComponent<Props> = ({ openShareDialog }) => (
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

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  openShareDialog: () => dispatch(showDialog('SHARE')),
});

export default connect(null, mapDispatchToProps)(EmailToolTip);
