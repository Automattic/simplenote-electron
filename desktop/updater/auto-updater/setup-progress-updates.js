const { app, dialog } = require('electron');
const ProgressBar = require('electron-progressbar');
const prettyBytes = require('pretty-bytes');

const progressBarBlue = '#4895d9';

/**
 * Set up progress bar dialogs, and add/remove listeners on the updater.
 */
const setupProgressUpdates = updater => {
  let progressBar;
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
      updater.removeListener('update-not-available', notifyNoUpdate);
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
    progressBar.on('progress', value => {
      progressBar.detail =
        prettyBytes(value) + ` of ${prettyBytes(totalBytes)} downloaded…`;
    });
    progressBar.on('aborted', () =>
      updater.removeListener('download-progress', updateProgress)
    );
  };

  const updateProgress = progress => {
    if (!progressBar) {
      preDownloadProgressBar.setCompleted();
      initProgressBar(progress.total);
    }
    progressBar.value = progress.transferred;
  };

  updater.on('update-not-available', notifyNoUpdate);
  updater.on('download-progress', updateProgress);
  updater.on('update-downloaded', () => {
    if (preDownloadProgressBar) {
      preDownloadProgressBar.setCompleted();
    }
    updater.removeListener('download-progress', updateProgress);
  });
};

module.exports = setupProgressUpdates;
