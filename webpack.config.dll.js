const webpack = require( 'webpack' );

module.exports = {
	context: process.cwd(),

	devtool: '#source-map',

	entry: {
		vendor: [
			'cookie',
			'create-hash',
			'draft-js',
			'highlight.js',
			'lodash',
			'marked',
			'moment',
			'promise',
			'react',
			'react-addons-shallow-compare',
			'react-addons-update',
			'react-redux',
			'redux',
			'redux-localstorage',
			'redux-thunk',
			'react-virtualized',
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
