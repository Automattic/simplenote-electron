import React, { Fragment } from 'react';
import ReactModal from 'react-modal';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import * as Dialogs from '../dialogs';

export const DialogRenderer = props => {
  const { appProps, themeClass, closeDialog, dialogs, isElectron } = props;

  const renderDialog = dialog => {
    const { key, params, ...dialogProps } = dialog;
    const DialogComponent = Dialogs[dialog.type];

    if (DialogComponent === null) {
      throw new Error('Unknown dialog type.');
    }

    const closeThisDialog = () => closeDialog({ key });

    return (
      <ReactModal
        key={key}
        className={classNames(themeClass, 'dialog-renderer--content')}
        isOpen
        onRequestClose={closeThisDialog}
        overlayClassName="dialog-renderer--overlay"
      >
        <DialogComponent
          dialog={dialogProps}
          requestClose={closeThisDialog}
          {...appProps}
          {...{ params, isElectron }}
        />
      </ReactModal>
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
