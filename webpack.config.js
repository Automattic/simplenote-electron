const autoprefixer = require( 'autoprefixer' );
const webpack = require( 'webpack' );
const AppCachePlugin = require( 'appcache-webpack-plugin' );
const HtmlWebpackPlugin = require( 'html-webpack-plugin' );

module.exports = {
	context: __dirname + '/lib',
	devtool: 'sourcemap',
	entry: [
		'./boot'
	],
	output: {
		path: __dirname + '/dist',
		filename: 'app.js'
	},
	module: {
		preLoaders: [
			{ test: /\.jsx?$/, exclude: /node_modules|lib\/simperium/, loaders: [ 'eslint-loader' ] }
		],
		loaders: [
			{ test: /\.jsx?$/, exclude: /node_modules/, loaders: [ 'babel' ] },
			{ test: /\.json$/, loader: 'json-loader'},
			{ test: /\.scss$/, loader: 'style-loader!css-loader!postcss-loader!sass-loader'}
		]
	},
	resolve: {
		extensions: ['', '.js', '.jsx', '.json', '.scss', '.css' ],
		moduleDirectories: [ 'lib', 'node_modules' ]
	},
	plugins: [
		new webpack.DllReferencePlugin( {
			context: process.cwd(),
			manifest: require( process.cwd() + '/dist/vendor.json' )
		} ),
		new AppCachePlugin(),
		new HtmlWebpackPlugin( {
			title: 'Simplenote',
			templateContent: require( './index-builder.js' ),
			inject: false
		} ),
		new webpack.DefinePlugin( {
			'process.env.NODE_ENV': JSON.stringify(
				process.env.NODE_ENV || 'development'
			)
		} )
	],
	postcss: [ autoprefixer() ]
};
