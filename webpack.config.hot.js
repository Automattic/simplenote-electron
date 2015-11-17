require( 'babel/register' );
var webpack = require( 'webpack' );
var baseConfig = require( './webpack.config.js' );

module.exports = Object.assign( {}, baseConfig, {
	devtool: 'eval-source-map',
	entry: [
		'webpack-hot-middleware/client'
	].concat(baseConfig.entry),
	plugins: baseConfig.plugins.concat( [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] )
} );
