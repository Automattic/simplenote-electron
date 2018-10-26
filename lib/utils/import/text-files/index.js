import { EventEmitter } from 'events';
import CoreImporter from '../';
import { endsWith } from 'lodash';

class TextFileImporter extends EventEmitter {
  constructor({ noteBucket, tagBucket }) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
  }

  importNotes = filesArray => {
    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });
    let importedNoteCount = 0;
    let lastFileName = '';

    if (!filesArray) {
      this.emit('stats', 'error', 'No text files to import.');
      return;
    }

    const importTextFile = file => {
      if (!file || !endsWith(file.name.toLowerCase(), '.txt')) {
        return;
      }

      // Limit file size we will read to 1mb
      if (file.size > 1000000) {
        return;
      }

      const fileReader = new FileReader();
      fileReader.onload = event => {
        const noteContent = event.target.result;
        if (!noteContent) {
          return;
        }

        const modifiedTime = file.lastModified / 1000;
        coreImporter.importNote({
          content: noteContent,
          modificationDate: modifiedTime,
          creationDate: modifiedTime,
        });

        importedNoteCount++;
        if (file.name === lastFileName) {
          this.emit('status', 'complete', importedNoteCount);
        } else {
          this.emit('status', 'progress', importedNoteCount);
        }
      };

      fileReader.readAsText(file);
    };

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      if (i + 1 === filesArray.length) {
        lastFileName = file.name;
      }
      importTextFile(file);
    }
  };
}

export default TextFileImporter;
