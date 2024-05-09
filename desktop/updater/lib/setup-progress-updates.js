const { app, dialog } = require('electron');
const ProgressBar = require('electron-progressbar');
const prettyBytes = import('pretty-bytes');

const progressBarBlue = '#4895d9';

/**
 * Set up progress bar dialogs, and add/remove listeners on the updater.
 */
const setupProgressUpdates = ({ updater, willAutoDownload }) => {
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
    updater.removeListener('update-not-available', notifyNoUpdate);
    closeProgressAndShowMessage({
      message: 'You’re up to date!',
      detail: `Simplenote ${app.getVersion()} is currently the newest version available.`,
    });
  };

  const notifyError = () => {
    updater.removeListener('error', notifyError);
    closeProgressAndShowMessage({
      message: 'Something went wrong!',
      detail: `Please try again later.`,
    });
  };

  const closeProgressAndShowMessage = ({ message, detail }) => {
    preDownloadProgressBar.setCompleted();
    setTimeout(() => {
      dialog.showMessageBox({
        message,
        detail,
        buttons: ['OK'], // needs to be set explicitly for Linux
      });
    }, 500); // Allow time for preDownloadProgressBar to close
  };

  const initProgressBar = (totalBytes) => {
    progressBar = new ProgressBar({
      indeterminate: false,
      title,
      text: 'Downloading…',
      maxValue: totalBytes,
      browserWindow: { closable: true },
      style,
    });
    progressBar.on('progress', (value) => {
      progressBar.detail =
        prettyBytes(value) + ` of ${prettyBytes(totalBytes)} downloaded…`;
    });
    progressBar.on('aborted', () =>
      updater.removeListener('download-progress', updateProgress)
    );
  };

  const updateProgress = (progress) => {
    if (!progressBar) {
      preDownloadProgressBar.setCompleted();
      initProgressBar(progress.total);
    }
    progressBar.value = progress.transferred;
  };

  updater.on('error', notifyError);
  updater.on('update-not-available', notifyNoUpdate);
  updater.on('update-available', () => {
    if (!willAutoDownload) {
      preDownloadProgressBar.setCompleted();

      // Allow time for preDownloadProgressBar to close
      setTimeout(() => updater.notify(), 500);
    }
  });
  updater.on('download-progress', updateProgress);
  updater.on('update-downloaded', () => {
    if (preDownloadProgressBar) {
      preDownloadProgressBar.setCompleted();
    }
    updater.removeListener('download-progress', updateProgress);
  });
};

module.exports = setupProgressUpdates;
