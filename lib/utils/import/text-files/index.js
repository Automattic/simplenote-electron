const fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
import { EventEmitter } from 'events';
//import moment from 'moment';
//import importNotes from '../';
import { endsWith } from 'lodash';

class TextFileImporter extends EventEmitter {
  importTextFiles = filePaths => {
    let importedNotes = [];
    if (!filePaths) {
      this.emit('stats', 'error', 'No text files to import.');
    }

    const importTextFile = filePath => {
      if (!filePath || !endsWith(filePath.toLowerCase(), '.txt')) {
        return;
      }

      fs.readFile(filePath, 'utf8', function(error, noteContent) {
        if (error) {
          return;
        }
        fs.stat(filePath, function(err, stats) {
          // Dan: run stats first and bail on large files!
          if (err) {
            return;
          }

          importedNotes.push({
            content: noteContent,
            lastModified: stats.mtime,
            creationDate: stats.ctime,
          });
        });
      });
    };

    for (const filePath of filePaths) {
      importTextFile(filePath);
    }

    console.log(importedNotes);

    //const notesObject = { activeNotes: importedNotes };
    //importNotes(notesObject, noteBucket);
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
