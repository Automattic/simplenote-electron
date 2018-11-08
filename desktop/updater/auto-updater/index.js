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

class AutoUpdater extends Updater {
  constructor({ changelogUrl, options = {} }) {
    super(changelogUrl, options);

    autoUpdater.on('error', this.onError.bind(this));
    autoUpdater.on('update-not-available', this.onNotAvailable.bind(this));
    autoUpdater.on('update-downloaded', this.onDownloaded.bind(this));

    autoUpdater.autoInstallOnAppQuit = false;
  }

  ping() {
    autoUpdater.checkForUpdates();
  }

  onConfirm() {
    AppQuit.allowQuit();
    autoUpdater.quitAndInstall();
  }
}

module.exports = AutoUpdater;
