function readConfig() {
	try {
		return require( './config' )();
	} catch ( e ) {
		console.error(
			'Could not read in the required configuration file.\n' +
			'This file should exist as `config.js` inside the project root directory.\n' +
			'Please consult the project README.md for further information.\n'
		);
		process.exit( 0 );
	}
}

function getConfig() {
	var config = readConfig();
	var pkg = require( './package.json' );
	config.version = pkg.version;
	return config;
}

module.exports = getConfig;
