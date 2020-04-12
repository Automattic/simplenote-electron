import { EventEmitter } from 'events';
import { endsWith, isEmpty, get, has } from 'lodash';
import JSZip from 'jszip';

import CoreImporter from '../';

let fs = null;
const isElectron = has(window, 'process.type');
if (isElectron) {
  fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
}

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

    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });

    let importedNoteCount = 0;

    const extractAndImport = zipObj => {
      return zipObj
        .async('string')
        .then(content => {
          const importedNote = JSON.parse(content);

          const title = importedNote.title;
          let textContent = title ? title + '\n' : '';
          textContent += get(importedNote, 'textContent', '');
          const note = {
            content: textContent,
            // note: the exported files don't tell us the creation date...
            modificationDate: importedNote.userEditedTimestampUsec / 1000000,
            pinned: importedNote.isPinned,
            tags: get(importedNote, 'labels', []).map(item => item.name),
          };

          if (importedNote.listContent) {
            note.content += importedNote.listContent
              .map(item => {
                return '- [' + (item.isChecked ? 'x' : ' ') + '] ' + item.text;
              })
              .join('\n');
          }

          return coreImporter.importNote(note, {
            ...this.options,
            isTrashed: importedNote.isTrashed,
          });
        })
        .then(() => {
          importedNoteCount++;
          this.emit('status', 'progress', importedNoteCount);
        });
    };

    fs.readFile(file.path, (err, data) => {
      if (err) {
        this.emit('status', 'error', 'Error reading file');
        return;
      }

      JSZip.loadAsync(data).then(zip => {
        const promises = zip.file(/.*\/Keep\/.*\.json/).map(extractAndImport);
        Promise.all(promises).then(() => {
          this.emit('status', 'complete', importedNoteCount);
        });
      });
    });
  };
}

export default GoogleKeepImporter;
