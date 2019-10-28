const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const getConfig = require('./get-config');
const spawnSync = require('child_process').spawnSync;
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = () => {
  const isDevMode = process.env.NODE_ENV === 'development';
  const config = getConfig();

  return {
    context: __dirname + '/lib',
    optimization: {
      namedModules: true,
      namedChunks: true,
      splitChunks: {
        cacheGroups: {
          default: false,
        },
      },
    },
    mode: isDevMode ? 'development' : 'production',
    devtool:
      process.env.SOURCEMAP || (isDevMode && 'cheap-module-eval-source-map'),
    devServer: { inline: true },
    entry: ['./boot'],
    output: {
      path: __dirname + '/dist',
      filename: 'app.[hash].js',
      chunkFilename: '[name].[chunkhash].js',
      ...(config.is_app_engine && {
        publicPath: config.web_app_url + '/',
      }),
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules\/core-js/,
          use: [
            {
              loader: 'babel-loader',
            },
          ],
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            isDevMode ? 'style-loader' : MiniCssExtractPlugin.loader,
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
                sassOptions: {
                  includePaths: [__dirname + '/lib'],
                },
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
      new MiniCssExtractPlugin({
        filename: isDevMode ? '[name].css' : '[name].[hash].css',
        chunkFilename: isDevMode ? '[id].css' : '[id].[hash].css',
      }),
      new webpack.DefinePlugin({
        config: JSON.stringify(config),
      }),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    ],
  };
};
