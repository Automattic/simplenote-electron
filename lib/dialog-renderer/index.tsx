import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { closeDialog } from '../state/ui/actions';

import * as Dialogs from '../dialogs';
import * as S from '../state';
import * as T from '../types';

type StateProps = {
  dialogs: T.DialogEntity[];
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = StateProps & DispatchProps;

export class DialogRenderer extends Component<Props> {
  static displayName = 'DialogRenderer';

  static propTypes = {
    appProps: PropTypes.object.isRequired,
    buckets: PropTypes.object,
    themeClass: PropTypes.string,
    isElectron: PropTypes.bool.isRequired,
    isMacApp: PropTypes.bool.isRequired,
  };

  renderDialog(dialog) {
    const {
      appProps,
      buckets,
      themeClass,
      isElectron,
      isMacApp,
      closeDialog,
    } = this.props;
    const { key, title } = dialog;
    const DialogComponent = Dialogs[dialog.type];

    if (DialogComponent === null) {
      throw new Error('Unknown dialog type.');
    }

    return (
      <Modal
        key={key}
        className="dialog-renderer__content"
        contentLabel={title}
        isOpen
        onRequestClose={closeDialog}
        overlayClassName="dialog-renderer__overlay"
        portalClassName={classNames('dialog-renderer__portal', themeClass)}
      >
        <DialogComponent
          buckets={buckets}
          dialog={dialog}
          requestClose={closeDialog}
          isElectron={isElectron}
          isMacApp={isMacApp}
          {...appProps}
        />
      </Modal>
    );
  }

  render() {
    return (
      <Fragment>{this.props.dialogs.map(this.renderDialog, this)}</Fragment>
    );
  }
}

const mapStateToProps = ({ ui: { dialogs } }) => ({
  dialogs,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(DialogRenderer);
