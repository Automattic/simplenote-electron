/**
 * External Dependencies
 */
var packager = require('electron-packager');
var fs = require('fs');
var path = require('path');

/**
 * Internal dependencies
 */
var config = require('./resources/lib/config');
var builder = require('./resources/lib/tools');
var pkg = require('./package.json');

/**
 * Module variables
 */
var electronVersion = pkg.devDependencies['electron'].replace('^', '');
var key;

var opts = {
  dir: './desktop-build',
  name: config.name,
  author: config.author,
  platform: builder.getPlatform(process.argv),
  arch: builder.getArch(process.argv),
  electronVersion,
  appVersion: config.version,
  appSign: 'Developer ID Application: ' + config.author,
  out: './release',
  icon: builder.getIconFile(process.argv),
  appBundleId: config.bundleId,
  helperBundleId: config.bundleId,
  appCategoryType: 'public.app-category.social-networking',
  buildVersion: config.version,
  overwrite: true,
  asar: false,
  sign: false,
  prune: true,
  ignore: [],
  'version-string': {
    CompanyName: config.author,
    LegalCopyright: config.copyright,
    ProductName: config.name,
    InternalName: config.name,
    FileDescription: config.name,
    OriginalFilename: config.name,
    FileVersion: config.version,
    ProductVersion: config.version,
  },
};

builder.beforeBuild(__dirname, opts, function(error) {
  if (error) {
    throw error;
  }

  packager(opts, function(err) {
    if (err) {
      console.log('Packager Error:');
      console.log(err);
    } else {
      builder.cleanUp(path.join(__dirname, 'release'), opts);
    }
  });
});
