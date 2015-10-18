module.exports = {
  context: __dirname,
  entry: ['./lib/app.js', './scss/app.scss'],
  output: {
    path: __dirname + "/dist",
    filename: "app.js"
  },
  module: {
    loaders: [
      // Transform JSX in .jsx files
      { test: /\.jsx$/, loader: 'jsx-loader?harmony' },
      { test: /\.json$/, loader: 'json-loader'},
      { test: /\.scss$/, loader: 'sass-loader'}
    ]
  }
};