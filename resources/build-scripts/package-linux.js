/* eslint-disable no-console */
'use strict';

var onErrorBail = function(error) {
  if (error) {
    console.log('Error: ' + error);
    process.exit(1);
  }
};

/**
 * External Dependencies
 */
const path = require('path');
const fs = require('fs');

/**
 * Internal dependencies
 */
const config = require('../lib/config');
const cp = require('child_process');

/**
 * Module variables
 */
console.log('Building Linux package...');

// copy build into place for packaging
cp.execSync('rm -rf release/tmp', onErrorBail); // clean start
cp.execSync('mkdir -p release/tmp/usr/share/applications', onErrorBail);
cp.execSync('mkdir -p release/tmp/usr/share/pixmaps', onErrorBail);
cp.execSync(
  'cp -r release/Simplenote-linux-x64 release/tmp/usr/share/simplenote',
  onErrorBail
);
cp.execSync(
  'mv release/tmp/usr/share/simplenote/Simplenote release/tmp/usr/share/simplenote/simplenote',
  onErrorBail
); // rename binary to wpcom
cp.execSync(
  'cp resources/linux/simplenote.desktop release/tmp/usr/share/applications/',
  onErrorBail
);
cp.execSync(
  'cp resources/images/icon_256x256.png release/tmp/usr/share/pixmaps/simplenote.png',
  onErrorBail
);

for (let type of ['deb', 'rpm']) {
  const cmd =
    `fpm --version ${config.version} --license "${config.license}" --name "${config.name.toLowerCase()}" ` +
    `--description "${config.description}" --vendor "${config.vendor}" --maintainer "${config.maintainer}" --url "${config.website}" ` +
    `-s dir -t ${type} --force --package ./release/simplenote-${config.version}.${type} -C release/tmp ./`;

  cp.execSync(cmd, onErrorBail);
}

cp.execSync('rm -rf release/tmp', onErrorBail);
