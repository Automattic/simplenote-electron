const EventEmitter = require('events').EventEmitter;
const { app, BrowserWindow, dialog, shell } = require('electron');
const platform = require('../../detect/platform');
const log = require('../../logger')('desktop:updater');

class Updater extends EventEmitter {
  constructor(changelogUrl, options) {
    super();

    this.changelogUrl = changelogUrl;
    this.confirmLabel = options.confirmLabel || 'Update & Restart';
    this.dialogTitle =
      options.dialogTitle || 'A new version of {name} is available!';
    this.dialogMessage =
      options.dialogMessage ||
      '{name} {newVersion} is now available — you have {currentVersion}. Would you like to update now?';

    this._version = '';
    this._hasPrompted = false;
  }

  ping() {}

  onDownloaded(event) {
    log.info('Update downloaded');

    // electron-updater provides us with new version
    if (event.version) {
      this.setVersion(event.version);
    }

    this.notify();
  }

  onNotAvailable() {
    log.info('Update is not available');
  }

  onError(event) {
    log.error('Update error', event);
  }

  onConfirm() {}

  onCancel() {}

  onChangelog() {
    shell.openExternal(this.changelogUrl);
  }

  async notify() {
    const updateDialogOptions = {
      buttons: [
        this.sanitizeButtonLabel(this.confirmLabel),
        'Cancel',
        'Release notes',
      ],
      title: 'Update Available',
      message: this.expandMacros(this.dialogTitle),
      detail: this.expandMacros(this.dialogMessage),
    };

    const mainWindow = BrowserWindow.getFocusedWindow();

    if (!this._hasPrompted) {
      this._hasPrompted = true;

      const selected = await dialog.showMessageBox(
        mainWindow,
        updateDialogOptions
      );
      const button = selected.response;

      if (button === 0) {
        // Confirm
        this.onConfirm();
      } else {
        this.onCancel();
      }

      this._hasPrompted = false;
      this.emit('end');
    }
  }

  setVersion(version) {
    this._version = version;
  }

  expandMacros(originalText) {
    const macros = {
      name: app.name,
      currentVersion: app.getVersion(),
      newVersion: this._version,
    };

    let text = originalText;

    for (const key in macros) {
      if (Object.prototype.hasOwnProperty.call(macros, key)) {
        text = text.replace(new RegExp(`{${key}}`, 'ig'), macros[key]);
      }
    }

    return text;
  }

  sanitizeButtonLabel(value) {
    if (platform.isWindows()) {
      return value.replace('&', '&&');
    }

    return value;
  }
}

module.exports = Updater;
