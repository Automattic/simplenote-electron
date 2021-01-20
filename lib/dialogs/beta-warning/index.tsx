import React, { Component } from 'react';
import { connect } from 'react-redux';
import SimplenoteLogo from '../../icons/simplenote';
import CrossIcon from '../../icons/cross';
import Dialog from '../../dialog';
import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

type DispatchProps = {
  closeDialog: () => any;
};

type Props = DispatchProps;

export class BetaWarning extends Component<Props> {
  render() {
    const { closeDialog } = this.props;

    return (
      <div className="about">
        <Dialog hideTitleBar onDone={closeDialog} title="Beta Release">
          <div className="about-top">
            <SimplenoteLogo />

            <h1>Simplenote</h1>
          </div>

          <p style={{ textAlign: 'center' }}>
            This is a beta release of Simplenote.
          </p>

          <p style={{ textAlign: 'center' }}>
            This release provides an opportunity to test and share early
            feedback for a major overhaul of the internals of the app.
          </p>

          <p style={{ textAlign: 'center' }}>
            Please use with caution and the understanding that <br />
            this comes without any stability guarantee.
          </p>

          <button
            type="button"
            aria-label="Close dialog"
            className="about-done button"
            onClick={closeDialog}
          >
            <CrossIcon />
          </button>
        </Dialog>
      </div>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(null, mapDispatchToProps)(BetaWarning);
