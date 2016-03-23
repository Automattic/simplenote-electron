'use strict';

const pkg = require( '../../package.json' );
let config = require( '../config-updater.json' );

// Merge in some details from package.json
config.name = pkg.productName;
config.description = 'Simplenote Desktop';
config.version = pkg.version;
config.author = pkg.author;

module.exports = config;
