import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import TabbedDialog from '../../tabbed-dialog';
import { viewExternalUrl } from '../../utils/url-utils';
import TopRightArrowIcon from '../../icons/arrow-top-right';
import PanelTitle from '../../components/panel-title';

import RadioGroup from '../radio-settings-group';
import ToggleGroup from '../toggle-settings-group';
import SettingsGroup, { Item } from '../settings-group';

import appState from '../../flux/app-state';
import { setWPToken } from '../../state/settings/actions';

const settingTabs = ['account', 'display'];

export class SettingsDialog extends Component {
  static propTypes = {
    actions: PropTypes.object.isRequired,
    appState: PropTypes.object.isRequired,
    onSignOut: PropTypes.func.isRequired,
    isElectron: PropTypes.bool.isRequired,
    onSetWPToken: PropTypes.func.isRequired,
    preferencesBucket: PropTypes.object.isRequired,
    requestClose: PropTypes.func.isRequired,
    toggleShareAnalyticsPreference: PropTypes.func.isRequired,
  };

  onEditAccount = () => viewExternalUrl('https://app.simplenote.com/settings');

  onToggleShareAnalyticsPreference = () => {
    this.props.toggleShareAnalyticsPreference({
      preferencesBucket: this.props.preferencesBucket,
    });
  };

  onSignOutRequested = () => {
    // Safety first! Check for any unsynced notes before signing out.
    const { noteBucket } = this.props;
    const { notes } = this.props.appState;

    noteBucket.hasLocalChanges((error, hasChanges) => {
      if (hasChanges) {
        this.showUnsyncedWarning();
        return;
      }

      // Also check persisted store for any notes with version 0
      const noteHasSynced = note =>
        new Promise((resolve, reject) =>
          noteBucket.getVersion(
            note.id,
            (e, v) => (e || v === 0 ? reject() : resolve())
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
    const { dialog, requestClose } = this.props;

    return (
      <TabbedDialog
        className="settings"
        title="Settings"
        tabs={settingTabs}
        onDone={requestClose}
        renderTabName={this.renderTabName}
        renderTabContent={this.renderTabContent}
        {...dialog}
      />
    );
  }

  renderTabName = tabName => tabName;

  renderTabContent = tabName => {
    const {
      activateTheme,
      setLineLength,
      setNoteDisplay,
      setSortType,
      toggleSortOrder,
    } = this.props;

    const {
      settings: {
        theme: activeTheme,
        lineLength,
        noteDisplay,
        sortType,
        sortReversed: sortIsReversed,
        accountName,
      },
    } = this.props;

    const { analyticsEnabled } = this.props.appState.preferences;

    switch (tabName) {
      case 'account':
        return (
          <div className="dialog-column settings-account">
            <PanelTitle headingLevel="3">Account</PanelTitle>
            <div className="settings-items theme-color-border">
              <div className="settings-item theme-color-border">
                <span className="settings-account-name">{accountName}</span>
              </div>
            </div>

            <ul className="dialog-actions">
              <li>
                <button
                  type="button"
                  className="button button button-borderless"
                  onClick={this.onEditAccount}
                >
                  Edit Account <TopRightArrowIcon />
                </button>
              </li>
              <li>
                <SettingsGroup
                  title="Privacy"
                  slug="shareAnalytics"
                  activeSlug={analyticsEnabled ? 'enabled' : ''}
                  description="Help us improve Simplenote by sharing usage data with our analytics tool."
                  onChange={this.onToggleShareAnalyticsPreference}
                  learnMoreURL="https://automattic.com/cookies"
                  renderer={ToggleGroup}
                >
                  <Item title="Share analytics" slug="enabled" />
                </SettingsGroup>
              </li>
              <li>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={this.onSignOutRequested}
                >
                  Log Out
                </button>
              </li>
            </ul>
          </div>
        );

      case 'display':
        return (
          <div className="dialog-column settings-display">
            <SettingsGroup
              title="Note display"
              slug="noteDisplay"
              activeSlug={noteDisplay}
              onChange={setNoteDisplay}
              renderer={RadioGroup}
            >
              <Item title="Comfy" slug="comfy" />
              <Item title="Condensed" slug="condensed" />
              <Item title="Expanded" slug="expanded" />
            </SettingsGroup>

            <SettingsGroup
              title="Line length"
              slug="lineLength"
              activeSlug={lineLength}
              onChange={setLineLength}
              renderer={RadioGroup}
            >
              <Item title="Narrow" slug="narrow" />
              <Item title="Full" slug="full" />
            </SettingsGroup>

            <SettingsGroup
              title="Sort type"
              slug="sortType"
              activeSlug={sortType}
              onChange={setSortType}
              renderer={RadioGroup}
            >
              <Item title="Date modified" slug="modificationDate" />
              <Item title="Date created" slug="creationDate" />
              <Item title="Alphabetical" slug="alphabetical" />
            </SettingsGroup>

            <SettingsGroup
              title="Sort order"
              slug="sortOrder"
              activeSlug={sortIsReversed ? 'reversed' : ''}
              onChange={toggleSortOrder}
              renderer={ToggleGroup}
            >
              <Item title="Reversed" slug="reversed" />
            </SettingsGroup>

            <SettingsGroup
              title="Theme"
              slug="theme"
              activeSlug={activeTheme}
              onChange={activateTheme}
              renderer={RadioGroup}
            >
              <Item title="Light" slug="light" />
              <Item title="Dark" slug="dark" />
            </SettingsGroup>
          </div>
        );
    }
  };
}

const { toggleShareAnalyticsPreference } = appState.actionCreators;

const mapDispatchToProps = dispatch => ({
  onSetWPToken: token => dispatch(setWPToken(token)),
  toggleShareAnalyticsPreference: args => {
    dispatch(toggleShareAnalyticsPreference(args));
  },
});

export default connect(null, mapDispatchToProps)(SettingsDialog);
