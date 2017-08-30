var gulp = require('gulp');
var connect = require('gulp-connect');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var templateCache = require('gulp-angular-templatecache');
var streamqueue = require('streamqueue');
var fs = require('fs');

gulp.task('default', ['minify', 'connect', 'watch']);

gulp.task('connect', function () {
  connect.server({
    root: ['demo', './'],
    livereload: true,
    middleware: function () {
      return [
        function (req, res, next) {
          if (req.url != '/uploads') return next();
          setTimeout(function () { res.end("{}"); }, 500);
        }
      ]
    }
  });
});

gulp.task('reload', ['minify'], function () {
  gulp.src(['./src/**', './demo/**']).pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(['./src/**', './demo/**'], ['reload']);
});

gulp.task('minify', function () {
  var files = ["src/angularSchemaFormCloudUploader.js", "src/**/*.js"];
  var stream = streamqueue({ objectMode: true },
    gulp.src(files),
    gulp.src(['src/templates/**/*.html']).pipe(templateCache({
      root: 'src/templates/', standalone: true,
    }))
  )
  .pipe(concat('angular-schema-form-cloud-uploader.js'))
  .pipe(gulp.dest('.'))
  .pipe(uglify({ output: { comments: 'some' } }))
  .pipe(rename('angular-schema-form-cloud-uploader.min.js'))
  .pipe(gulp.dest('.'));

  return stream;
});
