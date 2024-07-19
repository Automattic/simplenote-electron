'use strict';

/**
 * External Dependencies
 */
const { autoUpdater } = require('electron-updater');

/**
 * Internal dependencies
 */
const Updater = require('../lib/Updater');
const AppQuit = require('../../app-quit');
const setupProgressUpdates = require('../lib/setup-progress-updates');

class AutoUpdater extends Updater {
  constructor({ changelogUrl, options = {} }) {
    super(changelogUrl, options);

    autoUpdater.on('error', this.onError.bind(this));
    autoUpdater.on('update-not-available', this.onNotAvailable.bind(this));
    autoUpdater.on('update-downloaded', this.onDownloaded.bind(this));

    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.channel = 'beta';
  }

  // For non-user-initiated checks.
  // Check and download in the background, and only notify the user if
  // an update exists and has completed downloading.
  ping() {
    autoUpdater.checkForUpdates();
  }

  // For user-initiated checks.
  // Will check and download, displaying progress dialogs.
  pingAndShowProgress() {
    setupProgressUpdates({ updater: autoUpdater, willAutoDownload: true });
    autoUpdater.checkForUpdates();
  }

  onConfirm() {
    AppQuit.allowQuit();
    autoUpdater.quitAndInstall();
  }
}

module.exports = AutoUpdater;
