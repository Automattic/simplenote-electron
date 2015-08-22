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
var config ;
var settings = {};

try {
  config = require('./config.js');
} catch (e) {
  console.warn('no configuration file present');
  config = function() {
    return {};
  };
}

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

.task("js", function() {
  return browserify('./lib/app.js', {transform: ['reactify'], debug: true})
    // .transform({global: true}, "uglifyify")
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest(out));
})

.task("css", function() {
  return gulp.src('./scss/app.scss')
    .pipe(sass())
    .pipe(concat('app.css'))
    .pipe(gulp.dest(out));
})

.task("html", ["config"], function() {
  return gulp.src('./views/app.jade')
    .pipe(jade({locals:{config: settings}, pretty:"  "}))
    .pipe(rename('app.html'))
    .pipe(gulp.dest(out));
});
