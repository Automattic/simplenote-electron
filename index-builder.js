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

function getTemplateContent(templateParams) {
	return jade.renderFile( './views/app.jade', {
		o: templateParams,
		config: getConfig()
	} );
}

module.exports = getTemplateContent;
