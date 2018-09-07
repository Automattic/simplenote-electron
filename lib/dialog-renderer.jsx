import React from 'react';
import PropTypes from 'prop-types';
import * as Dialogs from './dialogs/index';
import { compact, concat, flowRight, map } from 'lodash';

export const DialogRenderer = props => {
  const { appProps, isElectron } = props;

  const renderDialogs = () => {
    const { dialogs } = props;

    const makeDialog = (dialog, key) => [
      dialog.modal && (
        <div key="overlay" className="dialogs-overlay" onClick={null} />
      ),
      renderDialog(dialog, key),
    ];

    return flowRight(compact, concat, map)(dialogs, makeDialog);
  };

  const renderDialog = ({ params, ...dialog }, key) => {
    const DialogComponent = Dialogs[dialog.type];

    if (DialogComponent === null) {
      throw new Error('Unknown dialog type.');
    }

    return (
      <DialogComponent
        isElectron={isElectron}
        {...appProps}
        {...{ key, dialog, params }}
      />
    );
  };

  if (props.dialogs.length === 0) {
    return null;
  }

  return <div className="dialogs">{renderDialogs()}</div>;
};

DialogRenderer.propTypes = {
  appProps: PropTypes.object.isRequired,
  dialogs: PropTypes.array.isRequired,
  isElectron: PropTypes.bool.isRequired,
};

export default DialogRenderer;
