import React, { Component } from 'react';
import Modal from 'react-modal';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import Dialog from '../../dialog';
import TabPanels from '../../components/tab-panels';
import { viewExternalUrl } from '../../utils/url-utils';

import AccountPanel from './panels/account';
import DisplayPanel from './panels/display';
import ToolsPanel from './panels/tools';

import appState from '../../flux/app-state';
import { setWPToken } from '../../state/settings/actions';

import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

const settingTabs = ['account', 'display', 'tools'];

type DispatchProps = {
  closeDialog: () => any;
  setWPToken: () => any;
};

export class SettingsDialog extends Component {
  static propTypes = {
    actions: PropTypes.object.isRequired,
    appState: PropTypes.object.isRequired,
    buckets: PropTypes.shape({
      noteBucket: PropTypes.object.isRequired,
      preferencesBucket: PropTypes.object.isRequired,
    }),
    onSignOut: PropTypes.func.isRequired,
    isElectron: PropTypes.bool.isRequired,
    isMacApp: PropTypes.bool.isRequired,
    onSetWPToken: PropTypes.func.isRequired,
    settings: PropTypes.object.isRequired,
    themeClass: PropTypes.string.isRequired,
    toggleShareAnalyticsPreference: PropTypes.func.isRequired,
  };

  onToggleShareAnalyticsPreference = () => {
    this.props.toggleShareAnalyticsPreference({
      preferencesBucket: this.props.buckets.preferencesBucket,
    });
  };

  onSignOutRequested = () => {
    // Safety first! Check for any unsynced notes before signing out.
    const { noteBucket } = this.props.buckets;
    const { notes } = this.props.appState;

    noteBucket.hasLocalChanges((error, hasChanges) => {
      if (hasChanges) {
        this.showUnsyncedWarning();
        return;
      }

      // Also check persisted store for any notes with version 0
      const noteHasSynced = note =>
        new Promise((resolve, reject) =>
          noteBucket.getVersion(note.id, (e, v) =>
            e || v === 0 ? reject() : resolve()
          )
        );

      Promise.all(notes.map(noteHasSynced)).then(
        () => this.signOut(), // All good, sign out now!
        () => this.showUnsyncedWarning() // Show a warning to the user
      );
    });
  };

  signOut = () => {
    const { onSignOut, onSetWPToken, isElectron } = this.props;

    // Reset the WordPress Token
    onSetWPToken(null);

    onSignOut();

    if (isElectron) {
      const ipcRenderer = __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
      ipcRenderer.send('clearCookies');
    }
  };

  showUnsyncedWarning = () => {
    const { isElectron } = this.props;
    isElectron ? this.showElectronWarningDialog() : this.showWebWarningDialog();
  };

  showElectronWarningDialog = () => {
    const dialog = __non_webpack_require__('electron').remote.dialog; // eslint-disable-line no-undef
    dialog.showMessageBox(
      {
        type: 'warning',
        buttons: ['Delete Notes', 'Cancel', 'Visit Web App'],
        title: 'Unsynced Notes Detected',
        message:
          'Logging out will delete any unsynced notes. You can verify your ' +
          'synced notes by logging in to the Web App.',
      },
      response => {
        if (response === 0) {
          this.signOut();
        } else if (response === 2) {
          viewExternalUrl('https://app.simplenote.com');
        }
      }
    );
  };

  showWebWarningDialog = () => {
    const shouldReallySignOut = confirm(
      'Warning: Unsynced notes were detected.\n\n' +
        'Logging out will delete any notes that have not synced. ' +
        'Check your connection and visit app.simplenote.com to verify synced notes.' +
        '\n\nClick OK to delete unsynced notes and Log Out.'
    );

    if (shouldReallySignOut) {
      this.signOut();
    }
  };

  render() {
    const {
      buckets,
      closeDialog,
      isElectron,
      isMacApp,
      settings,
      themeClass,
    } = this.props;
    const { analyticsEnabled } = this.props.appState.preferences;

    return (
      <Modal
        key="dialog-renderer__content__settings"
        className="dialog-renderer__content"
        contentLabel="Settings"
        isOpen
        onRequestClose={closeDialog}
        overlayClassName="dialog-renderer__overlay"
        portalClassName={classNames('dialog-renderer__portal', themeClass)}
      >
        <Dialog className="settings" title="Settings" onDone={closeDialog}>
          <TabPanels tabNames={settingTabs}>
            <AccountPanel
              accountName={settings.accountName}
              analyticsEnabled={analyticsEnabled}
              requestSignOut={this.onSignOutRequested}
              toggleShareAnalyticsPreference={
                this.onToggleShareAnalyticsPreference
              }
            />
            <DisplayPanel
              buckets={buckets}
              isElectron={isElectron}
              isMacApp={isMacApp}
            />
            <ToolsPanel />
          </TabPanels>
        </Dialog>
      </Modal>
    );
  }
}

const { toggleShareAnalyticsPreference } = appState.actionCreators;

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => {
    dispatch(closeDialog());
  },
  onSetWPToken: token => dispatch(setWPToken(token)),
  toggleShareAnalyticsPreference: args => {
    dispatch(toggleShareAnalyticsPreference(args));
  },
});

export default connect(null, mapDispatchToProps)(SettingsDialog);
