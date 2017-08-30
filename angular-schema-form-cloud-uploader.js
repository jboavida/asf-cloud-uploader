/**
 * @see {@link https://github.com/jboavida/asf-cloud-uploader}
 * @copyright João Pedro Boavida 2017
 * @license MIT
 */

'use strict';

angular.module('angularSchemaFormCloudUploader', [
  'angularFileUpload', 'schemaForm', 'templates'
]).config([
  'schemaFormDecoratorsProvider', 'sfBuilderProvider', 'sfErrorMessageProvider',
  function (
    schemaFormDecoratorsProvider, sfBuilderProvider, sfErrorMessageProvider
  ) {
    schemaFormDecoratorsProvider.defineAddOn(
      'bootstrapDecorator', 'cloud-uploader',
      'src/templates/angular-schema-form-cloud-uploader.html',
      sfBuilderProvider.stdBuilders
    );

    sfErrorMessageProvider.setDefaultMessage(
      'missingFile', 'No file selected'
    );
    sfErrorMessageProvider.setDefaultMessage(
      'uploadFailed', 'An upload has failed'
    );
    sfErrorMessageProvider.setDefaultMessage(
      'uploadOngoing', 'Still uploading'
    );
  }
]);

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

angular.module('templates', []).run(['$templateCache', function($templateCache) {$templateCache.put('src/templates/angular-schema-form-cloud-uploader.html','<fieldset class="form-group {{::form.htmlClass}}" ng-class="{\n  \'has-feedback\': form.feedback !== false,\n  \'has-error\': form.disableErrorState !== true && hasError(),\n  \'has-success\': form.disableSuccessState !== true && hasSuccess(),\n  \'required\': form.required === true\n}">\n  <legend class="control-label {{::form.labelHtmlClass}}"\n    ng-class="{ \'sr-only\': !showTitle() }">{{form.title}}</legend>\n\n  <span ng-if="form.feedback !== false" ng-class="{\n      \'glyphicon-ok\': form.disableSuccessState !== true && hasSuccess(),\n      \'glyphicon-remove\': form.disableErrorState !== true && hasError()\n    }" class="form-control-feedback glyphicon" aria-hidden="true"></span>\n\n  <span class="help-block" sf-message="form.description"></span>\n\n  <div asf-cloud-uploader schema-validate="form" sf-changed="form"\n    sf-field-model>\n    <table ng-show="uploader.queue.length" class="{{::form.queueHtmlClass}}">\n      <tr ng-repeat="item in uploader.queue">\n        <td class="{{::form.queueItemNameHtmlClass}}"\n          nowrap>{{item.file.name}}</td>\n\n        <td>\n          <button class="{{::form.queueItemRemoveHtmlClass}}"\n            ng-click="item.remove(); updateModel()" ng-disabled="form.readonly">\n            <span ng-if="form.queueItemRemoveIcon"\n              class="{{::form.queueItemRemoveIcon}}"></span>\n            {{form.queueItemRemoveLabel}}\n          </button>\n        </td>\n\n        <td ng-if="uploader.isHTML5" width="100%">\n          <div class="progress" ng-style="{ \'margin\': \'1px 0 0\' }">\n            <div class="{{::form.queueItemProgressHtmlClass}}"\n              ng-class="{ \'progress-bar-striped\': item.isUploading }"\n              ng-style="{ width: item.progress + \'%\' }" role="progressbar"\n              aria-valuemin="0" aria-valuemax="100"\n              aria-valuenow="{{item.progress}}">\n              <span class="sr-only">{{item.progress}}% complete</span>\n            </div>\n          </div>\n        </td>\n\n        <td nowrap>\n          <span ng-if="form.feedback !== false"><span ng-class="{\n            \'glyphicon-ok\': form.disableSuccessState !== true && item.isSuccess,\n            \'glyphicon-remove\': form.disableErrorState !== true && item.isError\n          }" class="glyphicon" aria-hidden="true"></span>&nbsp;</span>\n          <span class="sr-only">\n            {{item.isSuccess ? \'(uploaded)\' : item.isError ? \'(error)\' : \'\'}}\n          </span>\n        </td>\n      </tr>\n    </table>\n\n    <div ng-if="form.readonly !== true && uploader.isHTML5"\n      class="{{::form.dropZoneHtmlClass}}" nv-file-drop nv-file-over\n      over-class="{{::form.dropOverHtmlClass}}" uploader="uploader"></div>\n\n    <label class="{{::form.fieldHtmlClass}}"\n      ng-class="{ \'{{::form.fieldFocusHtmlClass}}\' : state.focus }"\n      role="button" ng-disabled="form.readonly || !queueOpen()">\n      <span ng-if="form.selectIcon" class="{{::form.selectIcon}}"></span>\n      {{form.selectLabel}}\n      <input type="file" ng-disabled="form.readonly || !queueOpen()"\n        ng-blur="state.focus = false " ng-focus="state.focus = true"\n        nv-file-select uploader="uploader" class="sr-only" />\n    </label>\n\n    <div ng-if="form.triggerSubmit"\n      class="{{::form.triggerSubmitHtmlClass}}"><label>\n      <input ng-disabled="uploader.queue.length && !uploader.isUploading"\n        ng-model="state.triggerSubmit" type="checkbox" />\n      {{form.triggerSubmit}}\n    </label></div>\n  </div>\n</fieldset>\n');}]);