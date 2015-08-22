var gulp       = require('gulp'),
    browserify = require('browserify'),
    package    = require('./package.json'),
    source     = require('vinyl-source-stream'),
    concat     = require('gulp-concat'),
    sass       = require('gulp-sass'),
    build      = 'dev';


var out = 'build/';

gulp

.task("default", ["build"])

.task("build", ["app", "css"])

.task("app", function() {
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
});
