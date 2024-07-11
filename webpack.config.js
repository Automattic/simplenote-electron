const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const getConfig = require('./get-config');
const fs = require('fs');
const spawnSync = require('child_process').spawnSync;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

// Object.assign(global, { WebSocket: require('ws') });

function createAppConfig() {
  const configPath = fs.existsSync('./config-local.json')
    ? './config-local.json'
    : './config.json';

  const configData = fs.readFileSync(configPath, 'utf8');
  fs.writeFileSync('app-config.json', configData, null, 2);
}

module.exports = () => {
  createAppConfig();
  const isDevMode = process.env.NODE_ENV === 'development';
  const config = getConfig();

  return {
    context: __dirname + '/lib',
    mode: isDevMode ? 'development' : 'production',
    devtool:
      process.env.SOURCEMAP || (isDevMode && 'eval-cheap-module-source-map'),
    entry: ['./boot'],
    output: {
      filename: 'app.[fullhash].js',
      chunkFilename: '[name].[chunkhash].js',
      ...(config.is_app_engine && {
        publicPath: config.web_app_url + '/',
      }),
    },
    // target: 'node',
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
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
                postcssOptions: {
                  plugins: [autoprefixer()],
                },
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
        {
          test: /\.ttf$/,
          type: 'asset/resource',
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.scss', '.css', '.ts', '.tsx'],
      modules: ['node_modules'],
    },
    plugins: [
      new NodePolyfillPlugin({
        includeAliases: [
          'Buffer',
          'buffer',
          'path',
          'process',
          'stream',
          'util',
        ],
      }),
      new HtmlWebpackPlugin({
        'build-platform': process.platform,
        'build-reference': spawnSync('git', ['describe', '--always', '--dirty'])
          .stdout.toString('utf8')
          .replace('\n', ''),
        favicon: process.cwd() + '/resources/images/favicon.ico',
        'node-version': process.version,
        template: 'index.ejs',
        title: 'Simplenote',
      }),
      new MiniCssExtractPlugin({
        filename: isDevMode ? '[name].css' : '[name].[fullhash].css',
        chunkFilename: isDevMode ? '[id].css' : '[id].[fullhash].css',
      }),
      new MonacoWebpackPlugin({
        languages: [],
        features: [
          '!bracketMatching',
          '!codeAction',
          '!codelens',
          '!colorDetector',
          '!comment',
          '!folding',
          '!gotoError',
          '!gotoLine',
          '!gotoSymbol',
          '!gotoZoom',
          '!inspectTokens',
          '!multicursor',
          '!parameterHints',
          '!quickCommand',
          '!quickOutline',
          '!referenceSearch',
          '!rename',
          '!snippets',
          '!suggest',
          '!toggleHighContrast',
        ],
      }),
      new webpack.DefinePlugin({
        __TEST__: JSON.stringify(process.env.NODE_ENV === 'test'),
        config: JSON.stringify(config),
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      // new webpack.ProvidePlugin({
      //   setImmediate: require.resolve('setimmediate/'),
      // }),
      // new webpack.ProvidePlugin({
      //   isemail: require.resolve('isemail/'),
      // }),
    ],
  };
};
