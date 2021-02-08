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
    const { theme, closeDialog } = this.props;

    return (
      <Fragment>
        {this.props.dialogs.map((dialog) => (
          <Modal
            key={dialog}
            className="dialog-renderer__content"
            contentLabel={dialog}
            isOpen
            onRequestClose={closeDialog}
            overlayClassName="dialog-renderer__overlay"
            portalClassName={`dialog-renderer__portal theme-${theme}`}
          >
            {'ABOUT' === dialog ? (
              <AboutDialog key="about" closeDialog={closeDialog} />
            ) : 'BETA-WARNING' === dialog ? (
              <BetaWarning key="beta-warning" />
            ) : 'CLOSE-WINDOW-CONFIRMATION' === dialog ? (
              <CloseWindowConfirmation key="close-window-confirmation" />
            ) : 'IMPORT' === dialog ? (
              <ImportDialog key="import" />
            ) : 'KEYBINDINGS' === dialog ? (
              <KeybindingsDialog key="keybindings" />
            ) : 'LOGOUT-CONFIRMATION' === dialog ? (
              <LogoutConfirmation key="logout-confirmation" />
            ) : 'SETTINGS' === dialog ? (
              <SettingsDialog key="settings" />
            ) : 'SHARE' === dialog ? (
              <ShareDialog key="share" />
            ) : 'TRASH-TAG-CONFIRMATION' === dialog ? (
              <TrashTagConfirmation key="trash-tag-confirmation" />
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
