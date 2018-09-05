const webpack = require('webpack');

module.exports = {
  context: process.cwd(),

  devtool: 'source-map',

  entry: {
    vendor: [
      'cookie',
      'create-hash',
      'crypto-random-string',
      'draft-js',
      'draft-js-simpledecorator',
      'electron-window-state',
      'highlight.js',
      'isemail',
      'jszip',
      'lodash',
      'moment',
      'promise',
      'prop-types',
      'react',
      'react-addons-update',
      'react-overlays',
      'react-redux',
      'react-virtualized',
      'redux',
      'redux-localstorage',
      'redux-thunk',
      'sanitize-filename',
      'showdown',
      'simperium',
      'valid-url',
    ],
  },

  node: {
    fs: 'empty',
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
