'use strict';

/**
 * External Dependencies
 */
const { app, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const ProgressBar = require('electron-progressbar');
const prettyBytes = require('pretty-bytes');

/**
 * Internal dependencies
 */
const Updater = require('../lib/Updater');
const AppQuit = require('../../app-quit');

const progressBarBlue = '#4895d9';

class AutoUpdater extends Updater {
  constructor({ changelogUrl, options = {} }) {
    super(changelogUrl, options);

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
    let progressBar, totalSizeString;
    const title = 'Update Simplenote';
    const style = {
      bar: {
        height: '8px',
        'border-radius': '0',
        'box-shadow': 'none',
      },
      value: {
        'background-color': progressBarBlue,
        'border-radius': '0',
        'box-shadow': 'none',
      },
    };

    const preDownloadProgressBar = new ProgressBar({
      title,
      text: 'Checking for Updates…',
      style,
    });

    const notifyNoUpdate = () => {
      preDownloadProgressBar.setCompleted();
      setTimeout(() => {
        dialog.showMessageBox({
          message: 'You’re up to date!',
          detail: `Simplenote ${app.getVersion()} is currently the newest version available.`,
        });
        autoUpdater.removeListener('update-not-available', notifyNoUpdate);
      }, 500); // Allow time for preDownloadProgressBar to close
    };

    const initProgressBar = totalBytes => {
      progressBar = new ProgressBar({
        indeterminate: false,
        title,
        text: 'Downloading…',
        maxValue: totalBytes,
        browserWindow: { closable: true },
        style,
      });
      totalSizeString = prettyBytes(totalBytes);
      progressBar.on('progress', value => {
        progressBar.detail =
          prettyBytes(value) + ` of ${totalSizeString} downloaded…`;
      });
      progressBar.on('aborted', () =>
        autoUpdater.removeListener('download-progress', progressUpdater)
      );
    };

    const progressUpdater = progress => {
      if (!progressBar) {
        preDownloadProgressBar.setCompleted();
        initProgressBar(progress.total);
      }
      progressBar.value = progress.transferred;
    };

    autoUpdater.on('update-not-available', notifyNoUpdate);
    autoUpdater.on('download-progress', progressUpdater);
    autoUpdater.on('update-downloaded', () => {
      if (preDownloadProgressBar) {
        preDownloadProgressBar.setCompleted();
      }
      autoUpdater.removeListener('download-progress', progressUpdater);
    });

    autoUpdater.checkForUpdates();
  }

  onConfirm() {
    AppQuit.allowQuit();
    autoUpdater.quitAndInstall();
  }
}

module.exports = AutoUpdater;
