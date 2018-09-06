const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const config = require('./get-config');
const spawnSync = require('child_process').spawnSync;

module.exports = {
  context: __dirname + '/lib',
  devtool: 'cheap-module-eval-source-map',
  entry: ['./boot'],
  output: {
    path: __dirname + '/dist',
    filename: 'app.js',
  },
  module: {
    rules: [
      {
        test: /lib\/.+\.jsx?$/,
        exclude: /node_modules|lib\/simperium/,
        enforce: 'pre',
        use: [
          {
            loader: 'eslint-loader',
            options: {
              cache: true,
              configFile: '.eslintrc',
              quiet: true,
            },
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          { loader: 'postcss-loader', options: { plugins: [autoprefixer()] } },
          'sass-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.scss', '.css'],
    modules: ['node_modules'],
  },
  plugins: [
    new webpack.DllReferencePlugin({
      context: process.cwd(),
      manifest: require(process.cwd() + '/dist/vendor.json'),
    }),
    new HtmlWebpackPlugin({
      'build-platform': process.platform,
      'build-reference': spawnSync('git', ['describe', '--always', '--dirty'])
        .stdout.toString('utf8')
        .replace('\n', ''),
      favicon: process.cwd() + '/public_html/favicon.ico',
      'node-version': process.version,
      template: 'index.ejs',
      title: 'Simplenote',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
      config: JSON.stringify(config()),
    }),
  ],
};
