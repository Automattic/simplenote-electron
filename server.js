var express = require('express'),
    browserify = require('browserify-middleware'),
    sass = require('node-sass-middleware'),
    app = express(),
    port = process.env.PORT || 4000,
    package = require('./package.json'),
    config;

if (process.env.NODE_ENV=='production') {
  app
  .use(express.static(__dirname + '/build'))
  .listen(port);
  return;
}

try {
  config = require('./config.js');
} catch (e) {
  console.error("Could not load config", e);
  config = function() { return {}; };
}

// use jade template engine
app.engine('jade', require('jade').__express);

app.set('view engine', 'jade');
app.set('views', process.cwd() + '/views');

// build app.js using browserify
app.get('/app.js', browserify('./lib/app.js', {transform: ['reactify', 'babelify']}));

// compile sass files
app.use(sass({
  src:process.cwd() + '/scss',
  debug:true,
  response:true
}));

// serve app html
app.get('/', function(req, res) {
  var settings = config();
  settings.build = 'dev';
  settings.resource_version = 'dev-' + (new Date()).getTime();
  settings.version = package.version;
  res.render('app', {config: settings});
});

// serve static assets

app.listen(port);

console.log("Running console on port %d", port);