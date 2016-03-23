'use strict';
/**
 * External Dependencies
 */
var path = require( 'path' );
var exec = require( 'child_process' ).execSync;

function cleanBuild( appPath, buildOpts ) {
	var appPath = appPath + '-' + buildOpts.arch;
	var files = [
		'resources/app/package.json',
		// 'resources/app/main.js'
	];

	console.log( 'Cleaning the Windows build' );

	for ( var i in files ) {
		var file = path.join( appPath, files[i] );
		exec( "/usr/bin/sed -i '' 's/Electron/" + buildOpts.name + "/' '" + file + "'" );
	}
}

module.exports = {
	cleaner: cleanBuild
}
