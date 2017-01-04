function readConfig() {
	try {
		const config = require( './config' );
		if ( typeof( config ) === 'function' ) {
			throw new Error( 'Invalid config file. Config must be JSON.' );
		}
		return config;
	} catch ( e ) {
		console.error(
			'Could not read in the required configuration file.\n' +
			'This file should exist as `config.json` inside the project root directory.\n' +
			'Please consult the project README.md for further information.\n'
		);

		throw e;
	}
}

function getConfig() {
	var config = readConfig();
	var pkg = require( './package.json' );
	config.version = pkg.version;
	return config;
}

module.exports = getConfig;
