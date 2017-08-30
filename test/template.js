
/* eslint-disable angular/file-name */

'use strict';

angular.module('test', [
  'schemaForm', 'angularSchemaFormCloudUploader'
]).value('settings', {
  model: {}
}).controller('FormController', [
  '$scope', 'settings', function ($scope, settings) {
    angular.extend($scope, settings);
  }
]);

function bootstrapTest(options) {
  options = options || {};

  spyUploader();
  prepareUploader(options.onLoad, options.loadTimeout);

  var schema = options.schema || { type: 'array', items: { type: 'string' } };
  var prep = {};
  prepareSF(prep, schema, options.form, options.model);
  schema = { type: 'object', properties: { files: prep.schema } };
  var form = [prep.form];

  var model = options.model ? { files: prep.model } : {};
  module(function ($provide) {
    $provide.decorator('settings', ['$delegate', function (settings) {
      settings.schema = schema;
      settings.form = form;
      settings.model = model;
      return settings;
    }]);
  });

  inject(function (
    $compile, $document, $rootScope, FileUploader, FileLikeObject
  ) {
    var app = $compile(
      '<div ng-controller="FormController">' +
        '<form sf-form="form" sf-model="model" sf-schema="schema"></form>' +
      '</div>'
    )($rootScope);
    angular.bootstrap(app[0], [
      'schemaForm', 'angularSchemaFormCloudUploader', 'test'
    ]);
    angular.element($document[0].body).append(app);
    var form = angular.element(app[0].querySelector('form[sf-form="form"]'));
    var field = angular.element(form[0].querySelector('fieldset'));
    if (!field || !field[0]) {
      if (options.fn) options.fn(app, form, field);
      return;
    }

    var directive = angular.element(
      field[0].querySelector('[asf-cloud-uploader]')
    );
    var scope = directive.scope();

    // app received unmodified service; apply changes made earlier
    var prop = (
      FileUploader.prototype.isHTML5 ? '_xhrTransport' : '_iframeTransport'
    );
    scope.uploader[prop] = FileUploader.prototype[prop];

    var filenames = options.filenames;
    if (filenames) {
      filenames = filenames.map(function (name) {
        return new FileLikeObject({ name: name, size: 0 });
      });
      scope.uploader.addToQueue(filenames, {}, []);
    }
    if (options.fn) options.fn(app, form, field, directive, scope);
  });
}


describe('cloudUploader template', function () {
  beforeEach(module('templates'));
  beforeEach(module('schemaForm'));

  beforeEach(module('angularFileUpload'));

  beforeEach(module('angularSchemaFormCloudUploader'));
  beforeEach(module('test'));

  describe('form', function () {
    it('supports `form.onChange`', function () {
      bootstrapTest({ form: {
        onChange: 'changed()'
      }, fn: function (app, form, field, directive) {
        var spy = app.scope().changed = jasmine.createSpy('changed');
        directive.controller('ngModel').$setViewValue([]);
        expect(spy).toHaveBeenCalled();
      } });
    });

    it('rejects invalid values', function () {
      bootstrapTest({ fn: function (app, form, field, directive, scope) {
        var ngModel = directive.controller('ngModel');
        ngModel.$setViewValue(24);
        scope.$digest();
        expect(ngModel.$valid).toBe(false);
      } });
    });

    it('supports `form.ngModelOptions`', function () {
      bootstrapTest({ form: {
        ngModelOptions: { allowInvalid: true, debounce: 123, updateOn: 'blur' }
      }, fn: function (app, form, field, directive, scope) {
        var ngModel = directive.controller('ngModel');
        var options = directive.controller('ngModelOptions').$options;
        expect(options.getOption('debounce')).toBe(123);
        expect(options.getOption('updateOn')).toBe('blur');
        ngModel.$setViewValue(24);
        scope.$digest();
        expect(ngModel.$valid).toBe(true);
      } });
    });

    it('supports `form.copyValueTo`', function () {
      bootstrapTest({ form: {
        copyValueTo: ['copy']
      }, fn: function (app, form, field, directive, scope) {
        expect(scope.model.copy).toBeUndefined();
        directive.controller('ngModel').$setViewValue(['file']);
        expect(scope.model.copy).toEqual(['file']);
      } });
    });

    // `form.condition` _is_ supported, but this test would not fail reliably
    xit('supports `form.condition`', function () {
      bootstrapTest({ form: {
        condition: 'false'
      }, fn: function (app, form, field) {
        expect(field[0]).toBeUndefined();
      } });
    });

    it('supports `form.destroyStrategy: "retain"`', function () {
      bootstrapTest({ form: {
        destroyStrategy: 'retain'
      }, model: ['file'], fn: function (app, form, field, directive, scope) {
          expect(scope.model.files).toEqual(['file']);
          field.scope().$broadcast('$destroy');
          expect(scope.model.files).toEqual(['file']);
        }
      });
    });

    it('supports `form.destroyStrategy: "null"`', function () {
      bootstrapTest({ form: {
        destroyStrategy: 'null'
      }, model: ['file'], fn: function (app, form, field, directive, scope) {
          expect(scope.model.files).toEqual(['file']);
          field.scope().$broadcast('$destroy');
          expect(scope.model.files).toBe(null);
        }
      });
    });
  });

  describe('root element', function () {
    it('uses `form.htmlClass`', function () {
      bootstrapTest({ form: {
        htmlClass: 'extra classes'
      }, fn: function (app, form, field) {
        expect(field.hasClass('extra')).toBe(true);
        expect(field.hasClass('classes')).toBe(true);
      } });
    });

    it('sets `has-error` class on error, if `!form.disableErrorState`',
    function () {
      bootstrapTest({ fn: function (app, form, field, directive, scope) {
        directive.controller('ngModel').$setViewValue(false);
        scope.$digest();
        expect(field.hasClass('has-error')).toBe(true);
      } });
    });

    it('does not set `has-error` class, if `form.disableErrorState`',
    function () {
      bootstrapTest({ form: {
        disableErrorState: true
      }, fn: function (app, form, field, directive, scope) {
        directive.controller('ngModel').$setViewValue(false);
        scope.$digest();
        expect(field.hasClass('has-error')).toBe(false);
      } });
    });

    it('sets `has-success` class on success, if `!form.disableSuccessState`',
    function () {
      bootstrapTest({ fn: function (app, form, field, directive, scope) {
        directive.controller('ngModel').$setViewValue([]);
        scope.$digest();
        expect(field.hasClass('has-success')).toBe(true);
      } });
    });

    it('does not set `has-success` class if `form.disableSuccessState`',
    function () {
      bootstrapTest({ form: {
        disableSuccessState: true
      }, fn: function (app, form, field, directive, scope) {
        directive.controller('ngModel').$setViewValue([]);
        scope.$digest();
        expect(field.hasClass('has-success')).toBe(false);
      } });
    });

    it('sets `required` class, if `form.required`',
    function () {
      bootstrapTest({ form: {
        required: true
      }, fn: function (app, form, field) {
        expect(field.hasClass('required')).toBe(true);
      } });
    });
  });

  describe('main label', function () {
    it('uses `form.labelHtmlClass`', function () {
      bootstrapTest({ form: {
        labelHtmlClass: 'extra classes'
      }, fn: function (app, form, field) {
        var label = field.find('legend');
        expect(label.hasClass('extra')).toBe(true);
        expect(label.hasClass('classes')).toBe(true);
      } });
    });

    it('obeys `form.notitle`', function () {
      bootstrapTest({ form: { notitle: true }, fn: function (app, form, field) {
        var label = field.find('legend');
        expect(label.hasClass('sr-only')).toBe(true);
      } });
    });
  });

  describe('form feedback', function () {
    it('missing if `!form.feedback`', function () {
      bootstrapTest({ form: {
        feedback: false
      }, model: ['file0'], fn: function (app, form, field) {
        var span = field[0].querySelector('.form-control-feedback');
        expect(span).toBe(null);
      } });
    })

    it('signals error, if `!form.disableErrorState`', function (done) {
      bootstrapTest({
        onLoad: function (item) {
          this._onErrorItem(item, {}, 200, {});
          this._onCompleteItem(item, {}, 200, {});
        },
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var span = angular.element(
            field[0].querySelector('.form-control-feedback')
          );
          var onCompleteAll = scope.uploader.onCompleteAll;
          scope.uploader.onCompleteAll = function () {
            onCompleteAll();
            scope.$digest();
            expect(scope.uploader.queue[0].file.name).toBe('file0');
            expect(span.hasClass('glyphicon-remove')).toBe(true);
            done();
          }
        }
      });
    });

    it('does not signal error, if `form.disableErrorState`', function (done) {
      bootstrapTest({
        form: { disableErrorState: true },
        onLoad: function (item) {
          this._onErrorItem(item, {}, 200, {});
          this._onCompleteItem(item, {}, 200, {});
        },
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var span = angular.element(
            field[0].querySelector('.form-control-feedback')
          );
          var onCompleteAll = scope.uploader.onCompleteAll;
          scope.uploader.onCompleteAll = function () {
            onCompleteAll();
            scope.$digest();
            expect(scope.uploader.queue[0].file.name).toBe('file0');
            expect(span.hasClass('glyphicon-remove')).toBe(false);
            done();
          }
        }
      });
    });

    it('signals success, if `!form.disableSuccessState`', function (done) {
      bootstrapTest({
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var span = angular.element(
            field[0].querySelector('.form-control-feedback')
          );
          var onCompleteAll = scope.uploader.onCompleteAll;
          scope.uploader.onCompleteAll = function () {
            onCompleteAll();
            scope.$digest();
            expect(scope.uploader.queue[0].file.name).toBe('file0');
            expect(span.hasClass('glyphicon-ok')).toBe(true);
            done();
          }
        }
      });
    });

    it('does not signal success, if `form.disableSuccessState`', function (done) {
      bootstrapTest({
        form: { disableSuccessState: true }, filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var span = angular.element(
            field[0].querySelector('.form-control-feedback')
          );
          var onCompleteAll = scope.uploader.onCompleteAll;
          scope.uploader.onCompleteAll = function () {
            onCompleteAll();
            scope.$digest();
            expect(scope.uploader.queue[0].file.name).toBe('file0');
            expect(span.hasClass('glyphicon-ok')).toBe(false);
            done();
          }
        }
      });
    });
  });

  describe('queue table', function () {
    it('not visible if uploader queue empty', function () {
      bootstrapTest({ fn: function (app, form, field) {
        var table = field.find('table');
        expect(table.hasClass('ng-hide')).toBe(true);
      } });
    });

    it('visible if uploader queue not empty', function () {
      bootstrapTest({ model: ['file'], fn: function (app, form, field) {
        var table = field.find('table');
        expect(table.hasClass('ng-hide')).toBe(false);
      } });
    });

    it('uses `form.queueHtmlClass`', function () {
      bootstrapTest({ form: {
        queueHtmlClass: 'queue name'
      }, model: ['file23'], fn: function (app, form, field) {
        var table = field.find('table');
        expect(table.hasClass('queue')).toBe(true);
        expect(table.hasClass('name')).toBe(true);
      } });
    });

    it('uses `form.queueItemRemoveHtmlClass`', function () {
      bootstrapTest({ form: {
        queueItemRemoveHtmlClass: 'queue name'
      }, model: ['file23'], fn: function (app, form, field) {
        var td = angular.element(field.find('tr').find('td')[1]);
        var button = td.find('button');
        expect(button.hasClass('queue')).toBe(true);
        expect(button.hasClass('name')).toBe(true);
      } });
    });

    it('uses `form.queueItemRemoveIcon`', function () {
      bootstrapTest({ form: {
        queueItemRemoveIcon: 'glyph-queue name'
      }, model: ['file23'], fn: function (app, form, field) {
        var td = angular.element(field.find('tr').find('td')[1]);
        var span = td.find('span');
        expect(span.hasClass('glyph-queue')).toBe(true);
        expect(span.hasClass('name')).toBe(true);
      } });
    });

    it('uses `form.queueItemRemoveLabel`', function () {
      bootstrapTest({ form: {
        queueItemRemoveLabel: 'delist this file'
      }, model: ['file23'], fn: function (app, form, field) {
        var td = angular.element(field.find('tr').find('td')[1]);
        var button = td.find('button');
        expect(button.html()).toContain('delist this file');
      } });
    });

    it('removal button removes item', function () {
      bootstrapTest({ model: [
        'file23', 'file next', 'file third'
      ], fn: function (app, form, field, directive, scope) {
        var before = [].concat(scope.uploader.queue);
        var tr = angular.element(field.find('tr')[1]);
        var td = angular.element(tr.find('td')[1]);
        var button = td.find('button');
        button.triggerHandler('click');
        var after = scope.uploader.queue;
        expect(after.length).toBe(2);
        expect(field.find('tr').length).toBe(2);
        expect(after[0]).toBe(before[0]);
        expect(after[1]).toBe(before[2]);
      } });
    });

    it('removal button triggers invalidation if required string', function () {
      bootstrapTest({
        schema: { type: 'string' }, form: { required: true }, model: 'file',
        fn: function (app, form, field, directive, scope) {
          var uploader = scope.uploader;
          expect(uploader.queue.length).toBe(1);
          expect(uploader.queue[0].file.name).toBe('file');
          expect(directive.hasClass('ng-valid')).toBe(true);
          var td = field.find('tr').find('td')[1];
          var button = angular.element(td).find('button');
          button.triggerHandler('click');
          expect(uploader.queue.length).toBe(0);
          expect(directive.hasClass('ng-valid')).toBe(false);
        }
      });
    });

    it('removal button disabled if `form.readonly`', function () {
      bootstrapTest({ form: {
        readonly: true
      }, model: ['preexisting'], fn: function (app, form, field) {
        var td = field.find('tr').find('td')[1];
        var button = angular.element(td).find('button');
        expect(button.attr('disabled')).toBe('disabled');
      } });
    });

    it('uses `form.queueItemProgressHtmlClass`', function () {
      bootstrapTest({ form: {
        queueItemProgressHtmlClass: 'queue name'
      }, model: ['file23'], fn: function (app, form, field) {
        var td = angular.element(field.find('tr').find('td')[2]);
        var bar = td.find('div').find('div');
        expect(bar.hasClass('queue')).toBe(true);
        expect(bar.hasClass('name')).toBe(true);
      } });
    });

    it('progress bar updates on progress', function (done) {
      bootstrapTest({
        loadTimeout: 10, filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[2]);
          var bar = td.find('div').find('div');
          var uploader = scope.uploader;

          uploader.onProgressItem = function (item, progress) {
            scope.$digest();
            expect(bar.hasClass('progress-bar-striped')).toBe(item.isUploading);
            expect(bar.attr('aria-valuenow')).toBe('' + progress);
            expect(bar.attr('style')).toContain('width: ' + progress + '%');
          }
          uploader.onCompleteItem = function (item) {
            uploader.onProgressItem(item, 100);
            done();
          }
        }
      });
    });

    it('text progress updates on progress', function (done) {
      bootstrapTest({
        loadTimeout: 10, filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[2]);
          var span = td.find('span');
          var uploader = scope.uploader;
          expect(span.hasClass('sr-only')).toBe(true);

          uploader.onProgressItem = function (item, progress) {
            scope.$digest();
            expect(span.html()).toContain(progress + '% complete');
          }
          uploader.onCompleteItem = function (item) {
            uploader.onProgressItem(item, 100);
            done();
          }
        }
      });
    });

    it('item outcome icon missing if `!form.feedback`', function () {
      bootstrapTest({ form: {
        feedback: false
      }, model: ['file0'], fn: function (app, form, field) {
        var td = angular.element(field.find('tr').find('td')[3]);
        var span = td[0].querySelector('span[aria-hidden]');
        expect(span).toBe(null);
      } });
    })

    it('item outcome icon signals error, if `!form.disableErrorState`',
    function (done) {
      bootstrapTest({
        onLoad: function (item) {
          this._onErrorItem(item, {}, 200, {});
          this._onCompleteItem(item, {}, 200, {});
        },
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span[aria-hidden]'));
          scope.uploader.onCompleteItem = function (item) {
            scope.$digest();
            expect(item.file.name).toBe('file0');
            expect(span.hasClass('glyphicon-remove')).toBe(true);
            done();
          }
        }
      });
    });

    it('no outcome icon signals error, if `form.disableErrorState`',
    function (done) {
      bootstrapTest({
        form: { disableErrorState: true },
        onLoad: function (item) {
          this._onErrorItem(item, {}, 200, {});
          this._onCompleteItem(item, {}, 200, {});
        },
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span[aria-hidden]'));
          scope.uploader.onCompleteItem = function (item) {
            scope.$digest();
            expect(item.file.name).toBe('file0');
            expect(span.hasClass('glyphicon-remove')).toBe(false);
            done();
          }
        }
      });
    });

    it('hidden text signals error', function (done) {
      bootstrapTest({
        onLoad: function (item) {
          this._onErrorItem(item, {}, 200, {});
          this._onCompleteItem(item, {}, 200, {});
        },
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span.sr-only'));
          scope.uploader.onCompleteItem = function () {
            scope.$digest();
            expect(span.html()).toContain('error');
            done();
          }
        }
      });
    });

    it('item outcome icon signals success, if `!form.disableSuccessState`',
    function (done) {
      bootstrapTest({
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span[aria-hidden]'));
          scope.uploader.onCompleteItem = function (item) {
            scope.$digest();
            expect(item.file.name).toBe('file0');
            expect(span.hasClass('glyphicon-ok')).toBe(true);
            done();
          }
        }
      });
    });

    it('no outcome icon signals success, if `form.disableSuccessState`',
    function (done) {
      bootstrapTest({
        form: { disableSuccessState: true }, filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span[aria-hidden]'));
          scope.uploader.onCompleteItem = function (item) {
            scope.$digest();
            expect(item.file.name).toBe('file0');
            expect(span.hasClass('glyphicon-ok')).toBe(false);
            done();
          }
        }
      });
    });

    it('hidden text signals success', function (done) {
      bootstrapTest({
        filenames: ['file0'],
        fn: function (app, form, field, directive, scope) {
          var td = angular.element(field.find('tr').find('td')[3]);
          var span = angular.element(td[0].querySelector('span.sr-only'));
          scope.uploader.onCompleteItem = function () {
            scope.$digest();
            expect(span.html()).toContain('uploaded');
            done();
          }
        }
      });
    });
  });

  describe('drop zone', function () {
    it('not available if `form.readonly`', function () {
      bootstrapTest({
        form: { readonly: true }, fn: function (app, form, field) {
          var drop = field[0].querySelector('[nv-file-drop]');
          expect(drop).toBe(null);
        }
      });
    });

    it('hidden if `!form.dropZoneHtmlClass`', function () {
      bootstrapTest({ fn: function (app, form, field) {
        var drop = angular.element(field[0].querySelector('[nv-file-drop]'));
        expect(drop.hasClass('ng-hide')).toBe(true);
      } });
    });

    it('uses `form.dropZoneHtmlClass`', function () {
      bootstrapTest({ form: {
        dropZoneHtmlClass: 'drop-zone-class'
      }, fn: function (app, form, field) {
        var drop = angular.element(field[0].querySelector('[nv-file-drop]'));
        expect(drop.hasClass('drop-zone-class')).toBe(true);
      } });
    });

    it('uses `form.dropOverHtmlClass`', function () {
      bootstrapTest({ form: {
        dropZoneHtmlClass: 'drop-zone-class', dropOverHtmlClass: 'over-here'
      }, fn: function (app, form, field) {
        var drop = angular.element(field[0].querySelector('[nv-file-over]'));
        expect(drop.attr('over-class')).toBe('over-here');
      } });
    });

    it('uses `nv-file-over` if `form.dropOverHtmlClass` not provided',
    function () {
      bootstrapTest({ form: {
        dropZoneHtmlClass: 'drop-zone-class'
      }, fn: function (app, form, field) {
        var drop = angular.element(field[0].querySelector('[nv-file-over]'));
        expect(drop.attr('over-class')).toBe('nv-file-over');
      } });
    });
  });

  describe('file input', function () {
    it('is nested within label', function () {
      bootstrapTest({ fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        var input = angular.element(field[0].querySelector('[type="file"]'));
        expect(label.find('input')[0]).toBe(input[0]);
      } });
    });

    it('is disabled if `form.readonly`', function () {
      bootstrapTest({ form: {
        readonly: true
      }, fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        var input = angular.element(field[0].querySelector('[type="file"]'));
        expect(label.attr('disabled')).toBe('disabled');
        expect(input.attr('disabled')).toBe('disabled');
      } });
    });

    it('is disabled if queue is full', function () {
      bootstrapTest({ form: {
        maxItems: 2
      }, model: ['file0', 'file1'], fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        var input = angular.element(field[0].querySelector('[type="file"]'));
        expect(label.attr('disabled')).toBe('disabled');
        expect(input.attr('disabled')).toBe('disabled');
      } });
    });

    it('uses `form.fieldHtmlClass`', function () {
      bootstrapTest({ form: {
        fieldHtmlClass: 'replace-class'
      }, fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        expect(label.hasClass('replace-class')).toBe(true);
      } });
    });

    it('uses `form.fieldFocusHtmlClass`', function () {
      bootstrapTest({ form: {
        fieldFocusHtmlClass: 'focus'
      }, fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        var input = field[0].querySelector('[type="file"]');
        expect(label.hasClass('focus')).toBe(false);
        input.focus();
        expect(label.hasClass('focus')).toBe(true);
        input.blur();
        expect(label.hasClass('focus')).toBe(false);
      } });
    });

    it('uses `form.selectIcon`', function () {
      bootstrapTest({ form: {
        selectIcon: 'glyphs'
      }, fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        var span = angular.element(label.find('span'));
        expect(span.hasClass('glyphs')).toBe(true);
      } });
    });

    it('uses `form.selectLabel`', function () {
      bootstrapTest({ form: {
        selectLabel: 'select these files'
      }, fn: function (app, form, field) {
        var label = angular.element(field[0].querySelector('[role="button"]'));
        expect(label.html()).toContain('select these files');
      } });
    });

    it('hiddes button', function () {
      bootstrapTest({ fn: function (app, form, field) {
        var input = angular.element(field[0].querySelector('[type="file"]'));
        expect(
          input.hasClass('sr-only-focusable') ||
          input.hasClass('sr-only') || input.hasClass('sr-hide')
        ).toBe(true);
      } });
    });
  });

  describe('submission trigger', function () {
    it('not present if `form.triggerSubmit` not provided', function () {
      bootstrapTest({ fn: function (app, form, field) {
        var trigger = field[0].querySelector('.checkbox');
        expect(trigger).toBe(null);
      } });
    });

    it('uses `form.triggerSubmitHtmlClass`', function () {
      bootstrapTest({ form: {
        triggerSubmit: 'submit trigger label',
        triggerSubmitHtmlClass: 'checkbox extra classes'
      }, fn: function (app, form, field) {
        var trigger = angular.element(field[0].querySelector('.checkbox'));
        expect(trigger.hasClass('extra')).toBe(true);
        expect(trigger.hasClass('classes')).toBe(true);
      } });
    });

    it('disabled when queue not empty and no upload in progress', function () {
      bootstrapTest({ form: {
        triggerSubmit: 'submit trigger label',
      }, model: ['file0'], fn: function (app, form, field) {
        var checkbox = angular.element(
          field[0].querySelector('[type="checkbox"]')
        );
        expect(checkbox.attr('disabled')).toBe('disabled');
      } });
    });
  });
});
