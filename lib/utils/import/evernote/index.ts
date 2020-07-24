import { EventEmitter } from 'events';
import parseISO from 'date-fns/parseISO';
import { endsWith } from 'lodash';

import CoreImporter from '../';

class EvernoteImporter extends EventEmitter {
  constructor({ noteBucket, tagBucket, options }) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
    this.options = options;
  }

  importNotes = (filesArray) => {
    if (!filesArray || filesArray.length === 0) {
      this.emit('status', 'error', 'Invalid Evernote export file.');
    }

    // We will always process only the first item in the array
    const file = filesArray[0];
    if (!file || !file.path) {
      this.emit('status', 'error', 'Could not find Evernote export file.');
    }

    if (!file.path || !endsWith(file.path.toLowerCase(), '.enex')) {
      this.emit('status', 'error', 'An Evernote .enex file is required.');
      return;
    }

    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });

    const addNotesToApp = (notes) => {
      if (!notes.length) {
        this.emit(
          'status',
          'error',
          'Error processing Evernote data or it did not contain any notes.'
        );
        return;
      }
      notes.forEach((note) => {
        coreImporter.importNote(note, this.options);
      });
      this.emit('status', 'complete', notes.length);
    };

    window.electron?.once('notesImported', addNotesToApp);
    window.electron?.send('importNotes', file.path);
  };

  getConvertedDate = (dateString) => {
    let convertedDate = parseISO(dateString).getTime() / 1000;
    if (isNaN(convertedDate)) {
      // Fall back to current date
      convertedDate = Date.now() / 1000;
    }

    return convertedDate;
  };
}

export default EvernoteImporter;
