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

function urlBuilder(version) {
  const platformString = 'linux';

  if (config.forceUpdate) {
    version = '0.0.1';
  }

  return config.updater.url
    .replace('{platform}', platformString)
    .replace('{version}', version);
}

module.exports = function() {
  app.on('will-finish-launching', function() {
    // TODO:@adlk: `electron-updater` supports AppImage as well
    if (platform.isOSX() || platform.isWindows()) {
      updater = new AutoUpdater();
    } else {
      const url = urlBuilder(app.getVersion());
      updater = new ManualUpdater(url);
    }

    // Start one straight away
    setTimeout(updater.ping.bind(updater), config.updater.delay);
  });
};
