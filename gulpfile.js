var gulp       = require('gulp'),
    browserify = require('browserify'),
    package    = require('./package.json'),
    source     = require('vinyl-source-stream'),
    concat     = require('gulp-concat'),
    sass       = require('gulp-sass'),
    build      = 'dev';

var config = {};
try {
  config = require('./config.json');
} catch (err) {
  console.error("Missing config.json, read README.md for instructions.");
}

config.version = package.version;

var build = 'build/';

gulp

.task("default", ["build"])

.task("build", ["app", "css"])

.task("app", function() {
  return browserify('./lib/app.js', {transform: ['reactify'], debug: true})
    // .transform({global: true}, "uglifyify")
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest(build));
})

.task("css", function() {
  return gulp.src('./scss/app.scss')
    .pipe(sass())
    .pipe(concat('app.css'))
    .pipe(gulp.dest(build));
});
