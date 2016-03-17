'use strict';
/**
 * External Dependencies
 */
var exec = require( 'child_process' ).execSync;
var path = require( 'path' );

function cleanBuild( appPath, buildOpts ) {
	var icon, tar, index;

	console.log( 'Cleaning the Linux build' );

	icon = 'cp ./resources/images/icon_128x128@2x.png ' + appPath + '/Simplenote.png';
	index = 'mv ' + appPath + '/resources/app/index.dist.js ' + appPath + '/resources/app/index.js';
	tar = 'tar -zcf ' + appPath + '.' + buildOpts.appVersion + '.tar.gz -C ' + buildOpts.out + ' ' + path.basename( appPath );

	exec( icon );
	exec( icon.replace( /ia32/g, 'x64' ) );
	exec( index );
	exec( tar );
	exec( tar.replace( /ia32/g, 'x64' ) );
}

module.exports = {
	cleaner: cleanBuild
}
