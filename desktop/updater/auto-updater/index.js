'use strict';

/**
 * External Dependencies
 */
const { app } = require('electron');
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

    if (app.getVersion().includes('-md-editor-wysiwyg')) {
      // We want users on the prototype to return to the stable release channel when a 2.27.2 or later ships.
      // This ensures users who replace their usual Simplenote app with the prototype are not stuck on this version forever.
      autoUpdater.allowPrerelease = false;
    }

    autoUpdater.on('error', this.onError.bind(this));
    autoUpdater.on('update-not-available', this.onNotAvailable.bind(this));
    autoUpdater.on('update-downloaded', this.onDownloaded.bind(this));

    autoUpdater.autoInstallOnAppQuit = false;
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
