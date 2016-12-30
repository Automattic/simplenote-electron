function readConfig() {
	var config = {};

	try {
		config = require( './config' );
	} catch ( e ) {
		console.warn( 'no configuration file present' );
	}

	return config();
}

function getConfig() {
	var config = readConfig();
	var pkg = require( './package.json' );
	config.version = pkg.version;
	return config;
}

module.exports = getConfig;
