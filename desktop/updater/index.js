'use strict';

/**
 * External Dependencies
 */
const { app } = require('electron');

/**
 * Internal dependencies
 */
const platform = require('../platform');
const config = require('../config');
const AutoUpdater = require('./auto-updater');
const ManualUpdater = require('./manual-updater');

let updater = false;

module.exports = function() {
  app.on('will-finish-launching', function() {
    if (platform.isOSX() || platform.isWindows() || process.env.APPIMAGE) {
      updater = new AutoUpdater({
        changelogUrl: config.updater.changelogUrl,
      });
    } else {
      updater = new ManualUpdater({
        downloadUrl: config.updater.downloadUrl,
        apiUrl: config.updater.apiUrl,
        changelogUrl: config.updater.changelogUrl,
        options: {
          dialogMessage:
            '{name} {newVersion} is now available — you have {currentVersion}. Would you like to download it now?',
          confirmLabel: 'Download',
        },
      });
    }

    // Start one straight away
    setTimeout(updater.ping.bind(updater), config.updater.delay);
  });
};
