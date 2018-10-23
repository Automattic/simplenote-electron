import React, { Fragment } from 'react';
import Modal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as Dialogs from '../dialogs';

export const DialogRenderer = props => {
  const { appProps, themeClass, closeDialog, dialogs, isElectron } = props;

  const renderDialog = dialog => {
    const { key, title, ...dialogProps } = dialog;
    const DialogComponent = Dialogs[dialog.type];

    if (DialogComponent === null) {
      throw new Error('Unknown dialog type.');
    }

    const closeThisDialog = () => closeDialog({ key });

    return (
      <Modal
        key={key}
        className="dialog-renderer--content"
        contentLabel={title}
        isOpen
        onRequestClose={closeThisDialog}
        overlayClassName="dialog-renderer--overlay"
        portalClassName={classNames('dialog-renderer--portal', themeClass)}
      >
        <DialogComponent
          dialog={dialogProps}
          requestClose={closeThisDialog}
          isElectron={isElectron}
          {...appProps}
        />
      </Modal>
    );
  };

  return <Fragment>{dialogs.map(renderDialog)}</Fragment>;
};

DialogRenderer.propTypes = {
  appProps: PropTypes.object.isRequired,
  themeClass: PropTypes.string,
  closeDialog: PropTypes.func.isRequired,
  dialogs: PropTypes.array.isRequired,
  isElectron: PropTypes.bool.isRequired,
};

export default DialogRenderer;
