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
      // note: If importing the note fails, it is silently ignored by the
      // promise below. This is okay since the warning message would be hidden
      // by the next progress update anyway.
      const importedNote = JSON.parse(jsonString);

      if (
        !importedNote.title &&
        !importedNote.textContent &&
        !importedNote.listContent
      ) {
        // empty note, skip
        return;
      }

      const title = importedNote.title;

      const importedContent = importedNote.listContent
        ? importedNote.listContent // Note has checkboxes, no text content
            .map(item => `- [${item.isChecked ? 'x' : ' '}] ${item.text}`)
            .join('\n')
        : importedNote.textContent;

      const textContent = title
        ? `${title}\n\n${importedContent}`
        : importedContent;

      return coreImporter
        .importNote(
          {
            content: textContent,
            // note: the exported files don't tell us the creation date...
            modificationDate: importedNote.userEditedTimestampUsec / 1e6,
            pinned: importedNote.isPinned,
            tags: get(importedNote, 'labels', []).map(item => item.name),
          },
          { ...this.options, isTrashed: importedNote.isTrashed }
        )
        .then(() => {
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

    const promises = filesArray.map(file =>
      fs.promises
        .readFile(file.path)
        .then(data => {
          if (endsWith(file.name.toLowerCase(), '.zip')) {
            return importZipFile(data);
          } else if (endsWith(file.name.toLowerCase(), '.json')) {
            // The data is a string, import it directly
            return importJsonString(data);
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
