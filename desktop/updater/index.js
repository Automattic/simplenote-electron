'use strict';

/**
 * External Dependencies
 */
const electron = require( 'electron' );
const app = electron.app;
const dialog = electron.dialog;

/**
 * Internal dependencies
 */
const platform = require( '../platform' );
const config = require( '../config' );
const AutoUpdater = require( './auto-updater' );
const ManualUpdater = require( './manual-updater' );

let updater = false;

function urlBuilder( version ) {
	let platformString = 'osx';

	if ( platform.isWindows() ) {
		platformString = 'windows';
	} else if ( platform.isLinux() ) {
		platformString = 'linux';
	}

	if ( config.forceUpdate ) {
		version = '0.0.1';
	}

	return config.updater.url.replace( '{platform}', platformString ).replace( '{version}', version );
}

module.exports = function() {
	app.on( 'will-finish-launching', function() {
		let url = urlBuilder( app.getVersion() );

		if ( platform.isOSX() ) {
			updater = new AutoUpdater( url );
		} else {
			updater = new ManualUpdater( url );
		}

		// Start one straight away
		setTimeout( updater.ping.bind( updater ), config.updater.delay );
	} );
};
