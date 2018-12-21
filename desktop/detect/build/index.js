'use strict';

/**
 * Module variables
 */
let build = false;

function Build() {
  this.build = false;
}

// These process properties can either be true or undefined

Build.prototype.isMAS = function() {
  return Boolean(process.mas);
};

Build.prototype.isWindowsStore = function() {
  return Boolean(process.windowsStore);
};

if (!build) {
  build = new Build();
}

module.exports = build;
