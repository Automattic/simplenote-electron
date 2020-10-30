const EventEmitter = require('events').EventEmitter;
const { app, dialog, shell } = require('electron');
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

  notify() {
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
    console.log('------');
    console.log('notify 1');
    console.log('------');
    if (!this._hasPrompted) {
      console.log('------');
      console.log('notify 2');
      console.log('------');
      this._hasPrompted = true;

      dialog.showMessageBox(updateDialogOptions, (button) => {
        this._hasPrompted = false;
        console.log('------');
        console.log('notify 4');
        console.log('------');
        if (button === 0) {
          // Confirm
          console.log('------');
          console.log('notify 5');
          console.log('------');
          this.onConfirm();
        } else if (button === 2) {
          // Open changelog
          this.onChangelog();
        } else {
          this.onCancel();
        }

        this.emit('end');
      });
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
