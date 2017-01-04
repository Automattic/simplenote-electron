var pug = require( 'pug' );

function getConfig() {
	var config = {};

	try {
		config = require( './config.js' )();
	} catch ( e ) {
		console.warn( 'no configuration file present' );
	}

	return config;
};

function getTemplateContent( templateParams ) {
	return pug.renderFile( './views/app.pug', {
		pkg: require( './package.json' ),
		o: templateParams,
		config: getConfig()
	} );
}

module.exports = getTemplateContent;
