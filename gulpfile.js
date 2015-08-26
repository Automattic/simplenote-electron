var gulp       = require('gulp'),
    jade       = require('gulp-jade'),
    browserify = require('browserify'),
    package    = require('./package.json'),
    source     = require('vinyl-source-stream'),
    concat     = require('gulp-concat'),
    sass       = require('gulp-sass'),
    build      = 'dev',
    rename     = require('gulp-rename'),
    exec       = require('child_process').exec;


var out = 'build/';
var config;
var settings = {};

try {
  config = require('./config.js');
} catch (e) {
  console.warn('no configuration file present');
  config = function() {
    return {};
  };
}

var js = function(name) {
  return function() {
    return browserify('./lib/' + name, {transform: ['reactify'], debug: true})
      .transform({global: true}, "uglifyify")
      .bundle()
      .pipe(source(name))
      .pipe(gulp.dest(out));
  }
};

gulp

.task("default", ["build"])

.task("config", function(cb) {
  exec('git describe --always --tag --long --dirty', function(err, stdout, stderr) {
    settings = config();
    settings.build = stdout.trim();
    settings.resource_version = config.build;
    cb(err);
  });
})

.task("build", ["js", "css", "html"])

.task("js", ['app'])

.task('app', js('app.js'))

.task("css", function() {
  return gulp.src('./scss/app.scss')
    .pipe(sass())
    .pipe(concat('app.css'))
    .pipe(gulp.dest(out));
})

.task("html", ["config"], function() {
  return gulp.src('./views/app.jade')
    .pipe(jade({locals:{config: settings}, pretty:"  "}))
    .pipe(rename('index.html'))
    .pipe(gulp.dest(out));
});
