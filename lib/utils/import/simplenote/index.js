import { EventEmitter } from 'events';
import CoreImporter from '../';
import { endsWith, isEmpty } from 'lodash';

class SimplenoteImporter extends EventEmitter {
  constructor({ noteBucket, tagBucket, options }) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
    this.options = options;
  }

  importNotes = filesArray => {
    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });

    if (isEmpty(filesArray)) {
      this.emit('status', 'error', 'No file to import.');
      return;
    }

    const file = filesArray[0];

    if (!endsWith(file.name.toLowerCase(), '.json')) {
      this.emit('status', 'error', 'File name does not end in ".json".');
      return;
    }

    // Limit file size we will read to 1mb
    if (file.size > 1000000) {
      this.emit('status', 'error', 'File should be less than 1 MB.');
      return;
    }

    const fileReader = new FileReader();

    fileReader.onload = event => {
      const fileContent = event.target.result;

      if (!fileContent) {
        this.emit('status', 'error', 'File was empty.');
        return;
      }

      const dataObj = JSON.parse(fileContent);
      const noteCount =
        dataObj.activeNotes.length + dataObj.trashedNotes.length;

      coreImporter.importNotes(dataObj, this.options);
      this.emit('status', 'complete', noteCount);
    };

    fileReader.readAsText(file);
  };
}

export default SimplenoteImporter;
