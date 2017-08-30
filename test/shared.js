'use strict';

if (!Element.prototype.closest) {
  var matches = (
    Element.prototype.matches || Element.prototype.msMatchesSelector ||
    Element.prototype.webkitMatchesSelector
  );
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
  Element.prototype.closest = function (s) {
    var el = this;
    var ancestor = this;
    // eslint-disable-next-line angular/document-service
    if (!document.documentElement.contains(el)) return null;
    do {
      if (matches.call(ancestor, s)) return ancestor;
      ancestor = ancestor.parentElement;
    } while (ancestor !== null);
    return null;
  }
}

// eslint-disable-next-line no-unused-vars
function prepareSF(scope, schema, form, model) {
  scope.schema = schema || {};
  if (model) scope.model = model;
  scope.form = angular.extend({
    key: 'files', schema: scope.schema, type: 'cloud-uploader'
  }, form);
}

// eslint-disable-next-line no-unused-vars
function prepareUploader(onLoad, timeout) {
  if (!onLoad) onLoad = function (item) {
    this._onSuccessItem(item, {}, 200, {});
    this._onCompleteItem(item, {}, 200, {});
  };
  if (!timeout) timeout = 5;
  return module(function ($provide) {
    $provide.decorator('FileUploader', ['$delegate', function(FileUploader) {
      var prop = (
        FileUploader.prototype.isHTML5 ? '_xhrTransport' : '_iframeTransport'
      );
      FileUploader.prototype[prop] = function (item) {
        var self = this;
        // eslint-disable-next-line angular/timeout-service
        setTimeout(
          function () { self._onProgressItem(item, 50); }, timeout / 2
        );
        // eslint-disable-next-line angular/timeout-service
        setTimeout(function () { onLoad.call(self, item); }, timeout);
      };
      return FileUploader;
    }]);
  });
}

// eslint-disable-next-line no-unused-vars
function spyUploader() {
  module(function ($provide) {
    $provide.decorator('FileUploader', ['$delegate', function(FileUploader) {
      spyOn(FileUploader.prototype, '_onCompleteItem').and.callThrough();
      return FileUploader;
    }]);
  });
}
