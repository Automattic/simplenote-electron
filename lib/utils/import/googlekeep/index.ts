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

    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });

    let importedNoteCount = 0;

    const importJsonString = jsonString => {
      const importedNote = JSON.parse(jsonString);

      const title = importedNote.title;
      let textContent = title ? title + '\n' : '';
      textContent += get(importedNote, 'textContent', '');

      const note = {
        content: textContent,
        // note: the exported files don't tell us the creation date...
        modificationDate: importedNote.userEditedTimestampUsec / 1e6,
        pinned: importedNote.isPinned,
        tags: get(importedNote, 'labels', []).map(item => item.name),
      };

      if (importedNote.listContent) {
        // Note has checkboxes
        note.content += importedNote.listContent
          .map(item => `- [${item.isChecked ? 'x' : ' '}] ${item.text}`)
          .join('\n');
      }

      const opts = { ...this.options, isTrashed: importedNote.isTrashed };
      return coreImporter.importNote(note, opts).then(() => {
        importedNoteCount++;
        this.emit('status', 'progress', importedNoteCount);
      });
    };

    const importZipFile = fileData =>
      JSZip.loadAsync(fileData).then(zip => {
        const promises = zip
          .file(/.*\/Keep\/.*\.json/)
          .map(zipObj => zipObj.async('string').then(importJsonString));
        return Promise.all(promises);
      });

    const importJsonFile = fileData => {
      //TODO
    };

    const promises = filesArray.map(file =>
      fs.promises
        .readFile(file.path)
        .then(data => {
          if (endsWith(file.name.toLowerCase(), '.zip')) {
            return importZipFile(data);
          } else {
            this.emit(
              'status',
              'error',
              `Invalid file extension: ${file.name}`
            );
          }
        })
        .catch(err => {
          this.emit('status', 'error', `Error reading file ${file.path}`);
        })
    );

    return Promise.all(promises).then(() => {
      this.emit('status', 'complete', importedNoteCount);
    });
  };
}

export default GoogleKeepImporter;
