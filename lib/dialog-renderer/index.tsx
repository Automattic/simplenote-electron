import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';

import AboutDialog from '../dialogs/about';
import BetaWarning from '../dialogs/beta-warning';
import CloseWindowConfirmation from '../dialogs/close-window-confirmation';
import ImportDialog from '../dialogs/import';
import KeybindingsDialog from '../dialogs/keybindings';
import LogoutConfirmation from '../dialogs/logout-confirmation';
import SettingsDialog from '../dialogs/settings';
import ShareDialog from '../dialogs/share';
import TrashTagConfirmation from '../dialogs/trash-tag-confirmation';
import { closeDialog } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';
import { getTheme } from '../state/selectors';

type OwnProps = {
  appProps: object;
};

type StateProps = {
  dialogs: T.DialogType[];
  theme: 'light' | 'dark';
};

type DispatchProps = {
  closeDialog: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class DialogRenderer extends Component<Props> {
  static displayName = 'DialogRenderer';

  render() {
    const { theme, closeDialog, dialogs } = this.props;
    return (
      <Fragment>
        {dialogs.map((dialog) => (
          <Modal
            key={dialog.type}
            className="dialog-renderer__content"
            contentLabel={dialog.type}
            isOpen
            onRequestClose={closeDialog}
            overlayClassName="dialog-renderer__overlay"
            portalClassName={`dialog-renderer__portal theme-${theme}`}
          >
            {'ABOUT' === dialog.type ? (
              <AboutDialog key="about" closeDialog={closeDialog} />
            ) : 'BETA-WARNING' === dialog.type ? (
              <BetaWarning key="beta-warning" />
            ) : 'CLOSE-WINDOW-CONFIRMATION' === dialog.type ? (
              <CloseWindowConfirmation key="close-window-confirmation" />
            ) : 'IMPORT' === dialog.type ? (
              <ImportDialog key="import" />
            ) : 'KEYBINDINGS' === dialog.type ? (
              <KeybindingsDialog key="keybindings" />
            ) : 'LOGOUT-CONFIRMATION' === dialog.type ? (
              <LogoutConfirmation key="logout-confirmation" />
            ) : 'SETTINGS' === dialog.type ? (
              <SettingsDialog key="settings" />
            ) : 'SHARE' === dialog.type ? (
              <ShareDialog key="share" />
            ) : 'TRASH-TAG-CONFIRMATION' === dialog.type ? (
              <TrashTagConfirmation
                key="trash-tag-confirmation"
                tagName={dialog.tagName}
              />
            ) : null}
          </Modal>
        ))}
      </Fragment>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  dialogs: state.ui.dialogs,
  theme: getTheme(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  closeDialog,
};

export default connect(mapStateToProps, mapDispatchToProps)(DialogRenderer);
