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
      // Transform JSX in .jsx files
      { test: /\.jsx$/, loader: 'jsx-loader?harmony' },
      { test: /\.json$/, loader: 'json-loader'},
      { test: /\.scss$/, loader: 'style!css!sass'},
      { test: /\.jade$/, loader: 'jade-loader' }
    ]
  },
  plugins: [new HtmlWebpackPlugin({
    title: "Simplenote",
    template: './views/app.jade'
  })]
};