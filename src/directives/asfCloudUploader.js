/**
 * @see {@link https://github.com/jboavida/asf-cloud-uploader}
 * @copyright João Pedro Boavida 2017
 * @license MIT
 */

'use strict';

angular.module('angularSchemaFormCloudUploader').value(
  'asfCloudUploaderDefaults', {
    alias: 'file',
    data: [],
    dropOverHtmlClass: 'nv-file-over',
    dropZoneHtmlClass: 'ng-hide',
    fieldHtmlClass: 'btn btn-default',
    headers: {},
    selectLabel: 'Upload',
    queueHtmlClass: 'table table-condensed table-striped',
    queueItemProgressHtmlClass: 'progress-bar',
    queueItemRemoveHtmlClass: 'btn btn-danger btn-xs',
    queueItemRemoveLabel: 'Unlist',
    triggerSubmitHtmlClass: 'checkbox'
  }
).directive('asfCloudUploader', [
  'asfCloudUploaderDefaults', 'FileUploader',
  function (defaults, FileUploader) {
    return {
      require: 'ngModel',
      scope: true,
      link: {
        pre: function (scope, element, attrs, ngModel) {
          var wantArray = scope.form.schema.type == 'array';
          var form = scope.form = angular.extend({
            maxItems: scope.form.schema.maxItems || Number.MAX_VALUE,
          }, defaults, {
            selectMultiple: wantArray,
          }, scope.form);
          if (!Element.prototype.closest) delete form.triggerSubmit;
          if (!form.selectMultiple || !wantArray) form.maxItems = 1;
          if (form.maxItems == 1) delete form.selectMultiple;

          var data = form.data || [];
          if (!angular.isArray(data)) data = [data];
          var uploader = new FileUploader({
            url: form.url,
            alias: form.alias || 'file',
            headers: form.headers || [],
            formData: data,
            autoUpload: true,
            queueLimit: form.maxItems,
            withCredentials: form.withCredentials
          });

          scope.state = {};

          var updateModel = scope.updateModel = function () {
            var pickName = function (item) { return item.file.name; };
            var names = scope.uploader.queue.map(pickName);
            ngModel.$setViewValue(wantArray ? names : names[0]);
            if (
              scope.hasSuccess && scope.hasSuccess()
            ) scope.$broadcast('schemaFormValidate');
            if (ngModel.$valid && names.length && scope.state.triggerSubmit) {
              var parent = angular.element(element[0].closest('form, ng-form'));
              if (
                parent && parent.hasClass('ng-valid')
              ) parent.triggerHandler('submit');
            }
          };
          uploader.onCompleteAll = updateModel;

          ngModel.$validators.uploadFailed = function () {
            for (var idx in scope.uploader.queue) {
              var item = scope.uploader.queue[idx];
              if (item.isCancel || item.isError) return false;
            }
            return true;
          };
          ngModel.$validators.uploadOngoing = function () {
            return !scope.uploader.getNotUploadedItems().length;
          };

          scope.queueOpen = function () {
            return scope.uploader.queue.length < scope.uploader.queueLimit;
          };
          scope.uploader = uploader;
        },
        post: function (scope, element, attrs, ngModel) {
          if (scope.form.selectMultiple) {
            var input = element[0].querySelector('input[type="file"]');
            angular.element(input).attr('multiple', '');
          }

          function updateLater() {
            var uploader = scope.uploader;
            if (uploader.queue.length) return;
            var value = ngModel.$viewValue;
            if (typeof value == 'string') value = [value];
            if (!angular.isArray(value) || !value.length) return;
            angular.forEach(value, function (name) {
              var dummy = new FileUploader.FileItem(uploader, { name: name });
              dummy.progress = 100;
              dummy.isUploaded = true;
              dummy.isSuccess = true;
              uploader.queue.push(dummy);
            });
          };

          var watch = scope.$watch('ngModel.$viewValue', function () {
            watch();
            updateLater();
          });
        }
      }
    };
  }
]);
