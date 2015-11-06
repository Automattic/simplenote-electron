var webpack = require( 'webpack' );
var baseConfig = require( './webpack.config.js' );

module.exports = Object.assign( {}, baseConfig, {
	devtool: 'eval-source-map',
	entry: [
		'webpack-dev-server/client?http://localhost:4000/',
		'webpack/hot/only-dev-server'
	].concat(baseConfig.entry),
	output: Object.assign( {}, baseConfig.output, {
		publicPath: 'http://localhost:4000/'
	} ),
	plugins: baseConfig.plugins.concat( [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] )
} );