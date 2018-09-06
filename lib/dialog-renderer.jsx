import React from 'react';
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

  return <div className="dialogs">{renderDialogs()}</div>;
};

export default DialogRenderer;
