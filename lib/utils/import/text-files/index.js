const fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
import { EventEmitter } from 'events';
import CoreImporter from '../';
import { endsWith } from 'lodash';

class TextFileImporter extends EventEmitter {
  constructor(noteBucket, tagBucket) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
  }

  importTextFiles = filePaths => {
    const coreImporter = new CoreImporter(this.noteBucket, this.tagBucket);
    let importedNoteCount = 0;
    if (!filePaths) {
      this.emit('stats', 'error', 'No text files to import.');
      return;
    }

    const importTextFile = filePath => {
      const self = this;
      if (!filePath || !endsWith(filePath.toLowerCase(), '.txt')) {
        return;
      }

      fs.stat(filePath, function(err, stats) {
        // Limit file size we will read to 1mb
        if (err || stats.size > 1000000) {
          return;
        }

        const modifiedTime = stats.mtimeMs / 1000;
        const creationTime = stats.ctimeMs / 1000;
        console.log(modifiedTime, creationTime);
        fs.readFile(filePath, 'utf8', function(error, noteContent) {
          if (error) {
            return;
          }

          coreImporter.importNote({
            content: noteContent,
            modificationDate: modifiedTime,
            creationDate: creationTime,
          });

          importedNoteCount++;
          self.emit('status', 'progress', importedNoteCount);
        });
      });
    };

    for (const filePath of filePaths) {
      importTextFile(filePath);
    }
  };

  importNotesFromFolder = folderPath => {
    const self = this;
    let filePathsArray = [];
    fs.readdir(folderPath, function(err, items) {
      for (let i = 0; i < items.length; i++) {
        filePathsArray.push(`${folderPath}/${items[i]}`);
      }

      self.importTextFiles(filePathsArray);
    });
  };
}

export default TextFileImporter;
