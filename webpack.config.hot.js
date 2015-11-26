require( 'babel/register' );
const webpack = require( 'webpack' );
const baseConfig = require( './webpack.config.js' );

module.exports = Object.assign( {}, baseConfig, {
	devtool: 'eval-source-map',
	entry: [
		'webpack-hot-middleware/client'
	].concat( baseConfig.entry ),
	plugins: baseConfig.plugins.concat( [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.NoErrorsPlugin()
	] )
} );
