'use strict';

/**
 * Module variables
 */
let platform = false;

function Platform() {
  this.platform = false;
}

Platform.prototype.isOSX = function () {
  return process.platform === 'darwin';
};

Platform.prototype.isWindows = function () {
  console.log('------');
  console.log(process.platform);
  console.log('------');
  return process.platform === 'win32';
};

Platform.prototype.isLinux = function () {
  return process.platform === 'linux';
};

if (!platform) {
  platform = new Platform();
}

module.exports = platform;
