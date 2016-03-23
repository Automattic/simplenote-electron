'use strict';

/**
 * External Dependencies
 */
var path = require( 'path' );
var fs = require( 'fs' );

/**
 * Internal dependencies
 */
var config = require( '../lib/config' );
var cp = require('child_process');

/**
 * Module variables
 */
console.log('Building Linux package...');

var onErrorBail = function( error ) {
	if (error) {
		console.log("Error: " + error);
		process.exit(1);
	}
};

// copy build into place for packaging
cp.execSync( "rm -rf release/tmp", onErrorBail ); // clean start
cp.execSync( "mkdir -p release/tmp/usr/share/applications", onErrorBail );
cp.execSync( "mkdir -p release/tmp/usr/share/pixmaps", onErrorBail );
cp.execSync( "cp -r release/Simplenote-linux-x64 release/tmp/usr/share/simplenote", onErrorBail );
cp.execSync( "mv release/tmp/usr/share/simplenote/Simplenote release/tmp/usr/share/simplenote/simplenote", onErrorBail );	// rename binary to wpcom
cp.execSync( "cp resources/linux/simplenote.desktop release/tmp/usr/share/applications/", onErrorBail );
cp.execSync( "cp resources/images/icon_256x256.png release/tmp/usr/share/pixmaps/simplenote.png", onErrorBail );

var cmd = [
	'fpm',
	'--version '  + config.version,
	'--license "GPLv2"',
	'--name "simplenote"',
	'--description "Simplenote for Linux"',
	'--vendor "Automattic, Inc."',
	'--maintainer "Simplenote Support <support@simplenote.com>"',
	'--url "https://simplenote.com/"',
	'-s dir',
	'-t deb',
	'--force', 			// forces overwrite of existing package
	'--package ./release/simplenote-' + config.version + '.deb',
	'-C release/tmp',	// starts file search here
	'./'
];

cp.execSync( cmd.join(' '), onErrorBail );

cp.execSync( "rm -rf release/tmp", onErrorBail );
