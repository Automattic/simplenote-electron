import { EventEmitter } from 'events';
import { endsWith, isEmpty } from 'lodash';

class GoogleKeepImporter extends EventEmitter {
  constructor({ noteBucket, tagBucket, options }) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
    this.options = options;
  }

  importNotes = filesArray => {
    if (isEmpty(filesArray)) {
      this.emit('status', 'error', 'No file to import.');
      return;
    }

    const file = filesArray[0];

    if (!endsWith(file.name.toLowerCase(), '.zip')) {
      this.emit('status', 'error', 'File name does not end in ".zip".');
      return;
    }

    //TODO: JSZip
    this.emit('status', 'error', 'Feature not implemented yet.');
  }
}

export default GoogleKeepImporter;
