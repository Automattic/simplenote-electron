var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	context: __dirname + "/lib",
	devtool: 'sourcemap',
	entry: [
		'./boot'
	],
	output: {
		path: __dirname + "/dist",
		filename: "app.js"
	},
	module: {
		loaders: [
			{ test: /\.jsx?$/, exclude: /node_modules/, loaders: [ 'babel-loader' ] },
			{ test: /\.json$/, loader: 'json-loader'},
			{ test: /\.scss$/, loader: 'style!css!sass'}
		]
	},
	resolve: {
		extensions: ['', '.js', '.jsx', '.json', '.scss', '.css' ],
		moduleDirectories: [ 'lib', 'node_modules' ]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "Simplenote",
			templateContent: require( './index-builder.js' ),
			inject: false
		})
	]
};