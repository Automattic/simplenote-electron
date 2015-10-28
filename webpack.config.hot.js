require('babel/register');
var webpack = require( 'webpack' );
var baseConfig = require( './webpack.config.js' );

module.exports = Object.assign( baseConfig, {
	entry: [
		'webpack-dev-server/client?http://localhost:4000/',
		'webpack/hot/only-dev-server',
		'./app.js'
	],
	module: {
			loaders: [
				{ test: /\.jsx?$/, exclude: /node_modules/, loaders: [ 'react-hot', 'babel-loader' ] },
			{ test: /\.json$/, loader: 'json-loader'},
			{ test: /\.scss$/, loader: 'style!css!sass'}
			]
	},
	output: Object.assign( baseConfig.output, {
		publicPath: 'http://localhost:4000/'
	} ),
	plugins: baseConfig.plugins.concat( [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] )
} );