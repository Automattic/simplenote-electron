import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import Dialog from '../../dialog';
import TabPanels from '../../components/tab-panels';
import { viewExternalUrl } from '../../utils/url-utils';

import AccountPanel from './panels/account';
import DisplayPanel from './panels/display';
import ToolsPanel from './panels/tools';

import { setWPToken } from '../../state/settings/actions';

import { closeDialog } from '../../state/ui/actions';

import * as S from '../../state';

const settingTabs = ['account', 'display', 'tools'];

type OwnProps = {
  actions: object;
  appState: object;
  buckets: Record<'noteBucket' | 'tagBucket' | 'preferencesBucket', T.Bucket>;
  isElectron: boolean;
  isMacApp: boolean;
  onSignOut: () => any;
  settings: S.State['settings'];
};

type DispatchProps = {
  closeDialog: () => any;
  setWPToken: (token: string) => any;
};

type Props = OwnProps & DispatchProps;

export class SettingsDialog extends Component<Props> {
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
    const { onSignOut, setWPToken, isElectron } = this.props;

    // Reset the WordPress Token
    setWPToken(null);

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
    const { buckets, closeDialog, isElectron, isMacApp, settings } = this.props;

    return (
      <Dialog className="settings" title="Settings" onDone={closeDialog}>
        <TabPanels tabNames={settingTabs}>
          <AccountPanel
            accountName={settings.accountName}
            requestSignOut={this.onSignOutRequested}
          />
          <DisplayPanel
            buckets={buckets}
            isElectron={isElectron}
            isMacApp={isMacApp}
          />
          <ToolsPanel />
        </TabPanels>
      </Dialog>
    );
  }
}

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  closeDialog: () => dispatch(closeDialog()),
  setWPToken: token => dispatch(setWPToken(token)),
});

export default connect(null, mapDispatchToProps)(SettingsDialog);
