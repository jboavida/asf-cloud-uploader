'use strict';

var minimal = angular.element(
  '<div asf-cloud-uploader schema-validate="form" ng-model="model"></div>'
);

describe('asfCloudUploader directive', function () {
  var $compile, $rootScope;

  beforeEach(module('templates'));
  beforeEach(module('schemaForm'));

  beforeEach(module('angularFileUpload'));
  beforeEach(prepareUploader());

  beforeEach(module('angularSchemaFormCloudUploader'));

  it('accepts changes to defaults', function () {
    module(function ($provide) {
      $provide.decorator('asfCloudUploaderDefaults', [
        '$delegate', function (defaults) {
          defaults = angular.copy(defaults);
          expect(defaults.selectLabel).not.toBe('Save these');
          defaults.selectLabel = 'Save these';
          expect(defaults.url).not.toBe('http://localhost:1234');
          defaults.url = 'http://localhost:1234';
          return defaults;
        }
      ]);
    });
    inject(function ($compile, $rootScope) {
      prepareSF($rootScope, { type: 'array' });
      var scope = $compile(minimal)($rootScope).scope();
      scope.$digest();
      expect(scope.form.selectLabel).toBe('Save these');
      var uploader = scope.uploader;
      expect(uploader.url).toBe('http://localhost:1234');
    });
  });

  describe('form options', function () {
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_; $rootScope = _$rootScope_;
    }));

    it('get `maxItems: Number.MAX_VALUE` if no default applies', function () {
      prepareSF($rootScope, { type: 'array' });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.maxItems).toBe(Number.MAX_VALUE);
    });

    it('get `maxItems: schema.maxItems` if no other value provided',
    function () {
      prepareSF($rootScope, { type: 'array', maxItems: 24 });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.maxItems).toBe(24);
    });

    it('get `maxItems: 1` if `!form.selectMultiple`', function () {
      prepareSF($rootScope, { type: 'array' }, { selectMultiple: false });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.maxItems).toBe(1);
    });

    it('use `form.maxItems` if provided and `form.selectMultiple`',
    function () {
      prepareSF($rootScope, { type: 'array' }, { maxItems: 4 });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.maxItems).toBe(4);
    });

    it('use additional `form` properties if provided', function () {
      prepareSF($rootScope, { type: 'array' }, {
        hello: 'world', selectLabel: 'Add this one'
      });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.hello).toBe('world');
      expect(scope.form.selectLabel).toBe('Add this one');
    });

    it('exclude `selectMultiple` if `form.maxItems == 1`', function () {
      prepareSF($rootScope, { type: 'array' }, {
        maxItems: 1, selectMultiple: true
      });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.selectMultiple).toBeUndefined();
    });

    it('exclude `triggerSubmit` if `element.closest` is not supported',
    function () {
      var closest = Element.prototype.closest;
      if (closest) Element.prototype.closest = undefined;
      prepareSF($rootScope, { type: 'array' }, { triggerSubmit: 'hey' });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.triggerSubmit).toBeUndefined();
      if (closest) Element.prototype.closest = closest;
    });

    it('keep `triggerSubmit` if `element.closest` is supported', function () {
      if (!Element.prototype.closest) pending();
      prepareSF($rootScope, { type: 'array' }, { triggerSubmit: 'hey' });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.form.triggerSubmit).toBe('hey');
    });
  });

  describe('uploader options', function () {
    beforeEach(inject(function (_$compile_, _$rootScope_) {
      $compile = _$compile_; $rootScope = _$rootScope_;
    }));

    it('use `url`, `alias`, `headers`, `data`, `maxItems`, `withCredentials`',
    function () {
      var form = {
        url: 'http://localhost/uploads', alias: 'name', headers: { a: 1 },
        data: [4, 2], maxItems: 32, withCredentials: true
      };
      prepareSF($rootScope, { type: 'array' }, form);
      var scope = $compile(minimal)($rootScope).scope();
      var uploader = scope.uploader;
      expect(uploader.url).toBe(form.url);
      expect(uploader.alias).toBe(form.alias);
      expect(uploader.headers).toBe(form.headers);
      expect(uploader.formData).toBe(form.data);
      expect(uploader.queueLimit).toBe(form.maxItems);
      expect(uploader.withCredentials).toBe(form.withCredentials);
    });

    it('uses `[form.data]` if `form.data` is object but not array',
    function () {
      var form = { data: { header: 1 } };
      prepareSF($rootScope, { type: 'array' }, form);
      var scope = $compile(minimal)($rootScope).scope();
      var uploader = scope.uploader;
      expect(uploader.formData[0]).toBe(form.data);
    });

    it('set `autoUpload: true`',
    function () {
      prepareSF($rootScope, { type: 'array' });
      var scope = $compile(minimal)($rootScope).scope();
      expect(scope.uploader.autoUpload).toBe(true);
    });
  });

  function uploadTest(options) {
    return function (done) {
      spyUploader();
      if (options.onLoad) prepareUploader(options.onLoad);
      inject(function ($compile, $rootScope, FileLikeObject) {
        if (options.before) options.before($compile, $rootScope);

        var schema = options.schema;
        if (!schema && !options.multiple) schema = { type: 'string' };
        if (!schema) schema = { type: 'array', items: { type: 'string' } };

        prepareSF($rootScope, schema);
        var element = $compile(minimal)($rootScope);
        var scope = element.scope();
        scope.$digest();
        var uploader = scope.uploader;

        var onCompleteAll = uploader.onCompleteAll;
        uploader.onCompleteAll = function () {
          onCompleteAll();
          scope.$digest();
          if (options.atEnd) options.atEnd(element, scope, uploader);
          done();
        }

        var file0 = new FileLikeObject({ name: 'file0', size: 0 });
        if (options.multiple) {
          var file1 = new FileLikeObject({ name: 'file1', size: 0 });
          uploader.addToQueue([file0, file1], {}, []);
        } else {
          uploader.addToQueue([file0], {}, []);
        }
        if (options.atMiddle) options.atMiddle(element, scope, uploader);
      });
    }
  }

  describe('when `selectMultiple: true`', function () {
    it('sets file input to multiple', inject(function ($compile, $rootScope) {
      var template = angular.copy(minimal).append(
        '<div><label><input type="file" /> File selector</input></div>'
      );
      prepareSF($rootScope, { type: 'array' }, { selectMultiple: true });
      var element = $compile(template)($rootScope);
      var input = element[0].querySelector('input[type="file"]');
      expect(input.getAttribute('multiple')).toBe('multiple');
    }));

    it('adds model items to uploader queue without calling uploader',
    function () {
      spyUploader();
      inject(function ($compile, $rootScope) {
        var model = ['file0', 'file1'];
        prepareSF($rootScope, { type: 'array' }, undefined, model);
        var element = $compile(minimal)($rootScope);
        var scope = element.scope();
        scope.$digest();

        var names = scope.uploader.queue.map(
          function (item) { return item.file.name; }
        );
        expect(names).toEqual(model);
        expect(scope.uploader._onCompleteItem.calls.count()).toEqual(0);
        expect(element.hasClass('ng-valid')).toBe(true);
      });
    });

    it('cannot update model before uploads complete', uploadTest({
      multiple: true,
      atMiddle: function (element, scope) {
        scope.updateModel();
        expect(element.hasClass('ng-invalid-upload-ongoing')).toBe(true);
      }
    }));

    it('cannot update model if upload fails', uploadTest({
      multiple: true,
      onLoad: function (item) {
        this._onErrorItem(item, {}, 200, {});
        this._onCompleteItem(item, {}, 200, {});
      },
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(2);
        expect(uploader._onCompleteItem.calls.count()).toEqual(2);
        expect(element.hasClass('ng-invalid-upload-failed')).toBe(true);
      }
    }));

    it('updates model after uploads complete', uploadTest({
      multiple: true,
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(2);
        expect(uploader._onCompleteItem.calls.count()).toEqual(2);
        expect(scope.model).toEqual(['file0', 'file1']);
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));

    it('items can be removed before upload starts', uploadTest({
      multiple: true,
      atMiddle: function (element, scope, uploader) {
        uploader.queue[1].remove();
      },
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(1);
        expect(uploader._onCompleteItem.calls.count()).toEqual(1);
        expect(scope.model).toEqual(['file0']);
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));

    it('items can be removed after upload ends', uploadTest({
      multiple: true,
      atMiddle: function (element, scope, uploader) {
        // eslint-disable-next-line angular/timeout-service
        setTimeout(function () { uploader.queue[0].remove(); }, 7);
      },
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(1);
        expect(uploader._onCompleteItem.calls.count()).toEqual(2);
        expect(scope.model).toEqual(['file1']);
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));

    it('checks schema on array', uploadTest({
      schema: { type: 'array', items: { type: 'string' }, minItems: 5 },
      multiple: true,
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(2);
        expect(uploader._onCompleteItem.calls.count()).toEqual(2);
        expect(scope.model).toBeUndefined();
        expect(element.hasClass('ng-valid')).toBe(false);
      }
    }));

    it('checks schema on items', uploadTest({
      schema: { type: 'array', items: { type: 'string', pattern: "file0" } },
      multiple: true,
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(2);
        expect(uploader._onCompleteItem.calls.count()).toEqual(2);
        expect(scope.model).toBeUndefined();
        expect(element.hasClass('ng-valid')).toBe(false);
        uploader.queue[1].remove();
        scope.updateModel();
        scope.$digest();
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));
  });

  describe('when `selectMultiple: false`', function () {
    it('does not set file input to multiple',
    inject(function ($compile, $rootScope) {
      var template = angular.copy(minimal).append(
        '<div><label><input type="file" /> File selector</input></div>'
      );
      prepareSF($rootScope, { type: 'string' });
      var element = $compile(template)($rootScope);
      var input = element[0].querySelector('input[type="file"]');
      expect(input.getAttribute('multiple')).toBe(null);
    }));

    it('adds model item to uploader queue without calling uploader',
    function () {
      spyUploader();
      inject(function ($compile, $rootScope) {
        var model = 'file0';
        prepareSF($rootScope, { type: 'string' }, undefined, model);
        var element = $compile(minimal)($rootScope);
        var scope = element.scope();
        scope.$digest();

        var names = scope.uploader.queue.map(
          function (item) { return item.file.name; }
        );
        expect(names).toEqual([model]);
        expect(scope.uploader._onCompleteItem.calls.count()).toEqual(0);
        expect(element.hasClass('ng-valid')).toBe(true);
      });
    });

    it('cannot update model before upload completes', uploadTest({
      atMiddle: function (element, scope) {
        scope.updateModel();
        expect(element.hasClass('ng-invalid-upload-ongoing')).toBe(true);
      }
    }));

    it('cannot update model if upload fails', uploadTest({
      onLoad: function (item) {
        this._onErrorItem(item, {}, 200, {});
        this._onCompleteItem(item, {}, 200, {});
      },
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(1);
        expect(uploader._onCompleteItem.calls.count()).toEqual(1);
        expect(element.hasClass('ng-invalid-upload-failed')).toBe(true);
      }
    }));

    it('updates model after upload completes', uploadTest({
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(1);
        expect(uploader._onCompleteItem.calls.count()).toEqual(1);
        expect(scope.model).toEqual('file0');
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));

    it('item can be removed after upload ends', uploadTest({
      atEnd: function (element, scope, uploader) {
        uploader.queue[0].remove();
        scope.updateModel();
        scope.$digest();
        expect(uploader.queue.length).toEqual(0);
        expect(uploader._onCompleteItem.calls.count()).toEqual(1);
        expect(scope.model).toBeUndefined();
        expect(element.hasClass('ng-valid')).toBe(true);
      }
    }));

    it('checks schema on name', uploadTest({
      schema: { type: 'string', pattern: "file1" },
      atEnd: function (element, scope, uploader) {
        expect(uploader.queue.length).toEqual(1);
        expect(uploader._onCompleteItem.calls.count()).toEqual(1);
        expect(scope.model).toBeUndefined();
        expect(element.hasClass('ng-valid')).toBe(false);
      }
    }));
  });

  describe('when submission trigger available', function () {
    function testTrigger(options) {
      if (options.valueInvalid && !options.schema) options.schema = {
        type: 'array', items: { type: 'integer' }
      };
      return function (done) {
        var closest = Element.prototype.closest;
        var spy = jasmine.createSpy('parent');
        uploadTest({
          schema: options.schema,
          before: function ($compile, $rootScope) {
            $rootScope.spy = spy;
            var form = $compile(
              '<form ng-model="a" ng-submit="spy()"></form>'
            )($rootScope);
            if (options.parentInvalid) form.controller('ngModel').$setValidity(
              'force-invalid', false
            );
            Element.prototype.closest = function () { return form; }
          },
          atMiddle: function (element, scope, uploader) {
            if (options.setTrigger) scope.state.triggerSubmit = true;
            if (options.atMiddle) options.atMiddle(element, scope, uploader);
          },
          atEnd: function (element, scope) {
            if (options.valueInvalid) {
              expect(element.hasClass('ng-invalid')).toBe(true);
            } else {
              expect(scope.model).toEqual('file0');
              expect(element.hasClass('ng-valid')).toBe(true);
            }
            if (options.shouldCall) {
              expect(spy.calls.count()).toBe(1);
            } else {
              expect(spy).not.toHaveBeenCalled();
            }
            Element.prototype.closest = closest;
          }
        })(done);
      };
    }

    it('can trigger after uploads complete', testTrigger({
      setTrigger: true, shouldCall: true
    }));

    it('does not trigger if trigger not set', testTrigger({
      setTrigger: false, shouldCall: false
    }));

    it('does not trigger if value not valid', testTrigger({
      valueInvalid: true, setTrigger: true, shouldCall: false
    }));

    it('does not trigger if parent form not valid', testTrigger({
      parentInvalid: true, setTrigger: true, shouldCall: false
    }));
  });
});
