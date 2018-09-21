'use strict';

/**
 * External Dependencies
 */
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const { dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const sanitizeHtml = require('sanitize-html');
const TurndownService = require('turndown');

const config = require('../../config');

/**
 * Internal dependencies
 */
const AppQuit = require('../../app-quit');

function AutoUpdater() {
  this.hasPrompted = false;

  autoUpdater.on('error', () => this.emit('end'));
  autoUpdater.on('update-not-available', () => this.emit('end'));
  autoUpdater.on('update-downloaded', this.onDownloaded.bind(this));
}

util.inherits(AutoUpdater, EventEmitter);

AutoUpdater.prototype.ping = function() {
  autoUpdater.checkForUpdates();
};

AutoUpdater.prototype.onDownloaded = function(info) {
  const releaseNotes = this.formatGithubReleaseNotes(info.releaseNotes);

  const updateDialogOptions = {
    buttons: ['Update & Restart', 'Cancel'],
    title: 'Update Available',
    message: `${config.name} ${info.releaseName}`,
    detail: releaseNotes,
  };

  if (this.hasPrompted === false) {
    this.hasPrompted = true;

    dialog.showMessageBox(updateDialogOptions, button => {
      this.hasPrompted = false;

      if (button === 0) {
        AppQuit.allowQuit();
        autoUpdater.quitAndInstall();
      } else {
        this.emit('end');
      }
    });
  }
};

AutoUpdater.prototype.formatGithubReleaseNotes = function(releaseNotes) {
  const turndownService = new TurndownService();

  let sanitizedHtml = releaseNotes;
  sanitizedHtml = sanitizeHtml(releaseNotes, {
    allowedTags: ['p', 'ul', 'ol', 'li'],
    allowedAttributes: [],
  }).replace(/\(@(.*)\)/g, ''); // remove user mentions

  return turndownService.turndown(sanitizedHtml);
};

module.exports = AutoUpdater;
