var jade = require( 'jade' );

function getConfig() {
	var config = {};

	try {
		config = require('./config.js')();
	} catch (e) {
		console.warn('no configuration file present');
	}

	return config;
};

function getTemplateContent() {
	return jade.renderFile( './views/app.jade', { config: getConfig() } );
}

module.exports = getTemplateContent();