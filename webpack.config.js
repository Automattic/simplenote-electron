const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const config = require('./get-config');
const spawnSync = require('child_process').spawnSync;
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

module.exports = () => {
  const isDevMode = process.env.NODE_ENV === 'development';

  return {
    context: __dirname + '/lib',
    mode: isDevMode ? 'development' : 'production',
    devtool:
      process.env.SOURCEMAP || (isDevMode && 'cheap-module-eval-source-map'),
    devServer: { inline: true },
    entry: ['./boot'],
    output: {
      path: __dirname + '/dist',
      filename: 'app.js',
      chunkFilename: '[name].js',
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
                configFile: '.eslintrc.json',
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
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevMode,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [autoprefixer()],
                sourceMap: isDevMode,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                includePaths: [__dirname + '/lib'],
                sourceMap: isDevMode,
              },
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.scss', '.css'],
      modules: ['node_modules'],
    },
    plugins: [
      new HardSourceWebpackPlugin(),
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
        config: JSON.stringify(config()),
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    ],
  };
};
