import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import Modal from 'react-modal';

import AboutDialog from '../dialogs/about';
import ImportDialog from '../dialogs/import';
import KeybindingsDialog from '../dialogs/keybindings';
import SettingsDialog from '../dialogs/settings';
import ShareDialog from '../dialogs/share';
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
              <AboutDialog key="about" />
            ) : 'IMPORT' === dialog ? (
              <ImportDialog key="import" />
            ) : 'KEYBINDINGS' === dialog ? (
              <KeybindingsDialog key="keybindings" />
            ) : 'SETTINGS' === dialog ? (
              <SettingsDialog key="settings" />
            ) : 'SHARE' === dialog ? (
              <ShareDialog key="share" />
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
