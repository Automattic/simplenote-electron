const webpack = require('webpack');

module.exports = () => {
  const isDevMode = process.env.NODE_ENV === 'development';

  return {
    context: process.cwd(),
    mode: isDevMode ? 'development' : 'production',
    devtool:
      process.env.SOURCEMAP || (isDevMode && 'cheap-module-eval-source-map'),

    entry: {
      vendor: [
        'cookie',
        'create-hash',
        'draft-js',
        'highlight.js',
        'lodash',
        'moment',
        'promise',
        'react',
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
};
