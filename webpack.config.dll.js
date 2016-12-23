const webpack = require( 'webpack' );

module.exports = {
	context: process.cwd(),

	entry: {
		vendor: [
			'cookie',
			'create-hash',
			'draft-js',
			'highlight.js',
			'lodash',
			'marked',
			'moment',
			'react',
			'react-addons-update',
			'react-redux',
			'redux',
			'redux-localstorage',
			'redux-thunk',
			'simperium',
			'sockjs-client'
		]
	},

	module: {
		loaders: [
			{ test: /\.json$/, loader: 'json-loader'},
		]
	},

	output: {
		filename: '[name].dll.js',
		path: __dirname + '/dist/',
		library: '[name]'
	},

	plugins: [
		new webpack.DllPlugin( {
			name: '[name]',
			path: __dirname + '/dist/[name].json'
		} )
	]
};
