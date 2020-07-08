'use strict';

/**
 * External dependencies
 */
const fs = require('fs');
var JSZip = require('jszip');

/**
 * Internal dependencies
 */
const log = require('./')('desktop:lib:archiver');

module.exports = {
  /**
   * Compresses `contents` to the archive at `dst`.
   *
   * @param {String[]} contents Paths to be zipped
   * @param {String} dst Path to destination archive
   * @param {function():void} onZipped Callback invoked when archive is complete
   */
  zipContents: (logPath, dst, onZipped) => {
    const zip = new JSZip();
    const contentPromise = new JSZip.external.Promise(function (
      resolve,
      reject
    ) {
      fs.readFile(logPath, function (err, data) {
        if (err) {
          log.warn('Unexpected error: ', err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    zip.file('simplenote.log', contentPromise);

    let output = fs.createWriteStream(dst);

    // Catch warnings (e.g. stat failures and other non-blocking errors)
    output.on('warning', function (err) {
      log.warn('Unexpected error: ', err);
    });

    output.on('error', function (err) {
      throw err;
    });

    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(output)
      .on('finish', function () {
        log.debug('Archive finalized');
        if (typeof onZipped === 'function') {
          onZipped();
        }
      });
  },
};
