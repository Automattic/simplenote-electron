import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { get } from 'lodash';

import DialogTypes from '../../shared/dialog-types';
import * as Dialogs from '../dialogs';
import { closeDialog } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  dialogs: T.DialogType[];
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

  renderDialog(dialogType: string) {
    const {
      appProps,
      buckets,
      themeClass,
      isElectron,
      isMacApp,
      closeDialog,
    } = this.props;

    const dialog = get(DialogTypes, dialogType);

    if (dialog === null) {
      throw new Error('Unknown dialog type.');
    }

    const DialogComponent = Dialogs[dialog.type];

    if (DialogComponent === null) {
      throw new Error('Unknown dialog type.');
    }

    return (
      <Modal
        key={dialog.title}
        className="dialog-renderer__content"
        contentLabel={dialog.title}
        isOpen
        onRequestClose={closeDialog}
        overlayClassName="dialog-renderer__overlay"
        portalClassName={classNames('dialog-renderer__portal', themeClass)}
      >
        <DialogComponent
          buckets={buckets}
          dialog={dialog}
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

const mapStateToProps: S.MapState<StateProps> = ({ ui: { dialogs } }) => ({
  dialogs,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(DialogRenderer);
