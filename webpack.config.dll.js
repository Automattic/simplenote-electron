const webpack = require('webpack');

module.exports = {
  context: process.cwd(),

  devtool: 'source-map',

  entry: {
    vendor: [
      'cookie',
      'create-hash',
      'highlight.js',
      'lodash',
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
      'showdown',
      'simperium',
      'sockjs-client',
    ],
  },

  output: {
    filename: '[name].dll.js',
    path: __dirname + '/dist/',
    library: '[name]',
  },

  plugins: [
    new webpack.DllPlugin({
      name: '[name]',
      path: __dirname + '/dist/[name].json',
    }),
  ],
};
