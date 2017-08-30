module.exports = function(config) {
  config.set({
    browsers: ['PhantomJS'],
    client: {
      captureConsole: true
    },
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-file-upload/dist/angular-file-upload.min.js',
      'bower_components/tv4/tv4.js',
      'bower_components/objectpath/lib/ObjectPath.js',
      'bower_components/angular-schema-form/dist/schema-form.js',
      'bower_components/angular-schema-form-bootstrap/bootstrap-decorator.js',
      'src/*.js',
      'src/**/*.js',
      'src/**/*.html',
      'test/shared.js',
      'test/*.js'
    ],
    frameworks: ['jasmine'],
    ngHtml2JsPreprocessor: {
      moduleName: 'templates'
    },
    plugins: [
      'karma-jasmine',
      'karma-ng-html2js-preprocessor',
      'karma-phantomjs-launcher',
      'karma-mocha-reporter'
    ],
    preprocessors: {
      'src/**/*.html': ['ng-html2js']
    },
    reporters: ['mocha'],
    singleRun: true
  });
};
