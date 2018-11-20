const EventEmitter = require('events').EventEmitter;
const { app, dialog, shell } = require('electron');
const platform = require('../../platform');

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
    console.log('Update downloaded');

    // electron-updater provides us with new version
    if (event.version) {
      this.setVersion(event.version);
    }

    this.notify();
  }

  onNotAvailable() {
    console.log('Update is not available');
  }

  onError(event) {
    console.log('Update error', event);
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

    if (!this._hasPrompted) {
      this._hasPrompted = true;

      dialog.showMessageBox(updateDialogOptions, button => {
        this._hasPrompted = false;

        if (button === 0) {
          // Confirm
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
      name: app.getName(),
      currentVersion: app.getVersion(),
      newVersion: this._version,
    };

    let text = originalText;

    for (const key in macros) {
      if (macros.hasOwnProperty(key)) {
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
