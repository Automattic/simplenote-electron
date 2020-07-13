'use strict';

/**
 * External dependencies
 */
const path = require('path');
const { app, dialog } = require('electron');

/**
 * Internal dependencies
 */
const config = require('../config');
const { zipContents } = require('./archiver');
const log = require('.')('desktop:get-logs');

/**
 * Module variables
 */
const logPath = path.join(
  (app && app.getPath('appData')) || '',
  'logs',
  'simplenote-main.log'
);

const pad = (n) => `${n}`.padStart(2, '0');

const localDateTime = () => {
  const now = new Date();
  return (
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    'T' +
    pad(now.getHours()) +
    '.' +
    pad(now.getMinutes()) +
    '.' +
    pad(now.getSeconds()) +
    '.' +
    pad(now.getMilliseconds())
  );
};

module.exports = function (window) {
  const onZipped = (file) =>
    function () {
      dialog.showMessageBox(window, {
        type: 'info',
        buttons: ['OK'],
        title: 'Application logs saved to your desktop',
        message:
          'Application logs saved to your desktop' +
          '\n\n' +
          `${path.basename(file)}`,
        detail:
          'For help with an issue, please contact support@simplenote.com and share your logs.',
      });
    };

  const onError = (error) =>
    dialog.showMessageBox(window, {
      type: 'info',
      buttons: ['OK'],
      title: 'Error getting application logs',
      message: 'Error getting application logs',
      detail:
        'Please contact support@simplenote.com and mention the error details below:' +
        '\n\n' +
        error.stack +
        '\n\n' +
        'System info: ' +
        JSON.stringify(config.version),
    });

  try {
    const timestamp = localDateTime();
    const desktop = app.getPath('desktop');
    const dst = path.join(desktop, `simplenote-${timestamp}.zip`);
    return zipContents(logPath, dst, onZipped(dst));
  } catch (error) {
    log.error('Failed to zip logs: ', error);
    onError(error);
  }
};
