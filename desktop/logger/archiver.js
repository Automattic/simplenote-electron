'use strict';

/**
 * External dependencies
 */
const fs = require('fs');
const JSZip = require('jszip');

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
    zip.file(
      'simplenote.log',
      new Promise((resolve, reject) =>
        fs.readFile(logPath, (error, data) => {
          if (error) {
            log.warn('Unexpected error: ', error);
            reject(error);
          } else {
            resolve(data);
          }
        })
      )
    );

    const output = fs.createWriteStream(dst);

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
