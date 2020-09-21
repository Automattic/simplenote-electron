'use strict';

/**
 * External Dependencies
 */
// const fs = require('fs');
const debug = require('debug')('desktop:i18n');

/**
 * Internal dependencies
 */
// const assets = require('lib/assets');
// const i18n = require('client/lib/mixins/i18n');
const i18n = require('i18n-calypso');
import getConfig from '../../get-config';
const config = getConfig();

function getTranslationsFilePath(locale) {
  //   return assets.getPath('languages/' + locale + '.json');
  return 'languages/' + locale + '.json';
}

function loadTranslations(locale) {
  let translations = null;
  let languageFile = getTranslationsFilePath(locale);

  debug('Looking for translation file: ' + languageFile);
  //   if (fs.existsSync(languageFile)) {
  try {
    //   translations = JSON.parse(fs.readFileSync(languageFile));
    debug('Parsed translations');
  } catch (e) {
    debug('Failed to parse translations file', e);
  }
  //   }

  return translations;
}

module.exports = {
  init: function (locale) {
    debug('Initialize i18n for ' + locale);
    let translations = null;
    if (locale !== config('i18n_default_locale_slug')) {
      translations = loadTranslations(locale);
    }
    i18n.initialize(translations);
  },

  // Pass-through mixin translation functions
  translate: i18n.translate,
  moment: i18n.moment,
  numberFormat: i18n.numberFormat,
};
