var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  context: __dirname + "/lib",
  entry: ['./app.js'],
  output: {
    path: __dirname + "/dist",
    filename: "app.js"
  },
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel-loader'},
      { test: /\.json$/, loader: 'json-loader'},
      { test: /\.scss$/, loader: 'style!css!sass'}
    ]
  },
  plugins: [new HtmlWebpackPlugin({
    title: "Simplenote",
    templateContent: require( './index-builder.js' )
  })]
};