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
