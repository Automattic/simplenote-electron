import { EventEmitter } from 'events';
import parseISO from 'date-fns/parseISO';
import { endsWith } from 'lodash';
import CoreImporter from '../';

import * as T from '../../../types';

class EvernoteImporter extends EventEmitter {
  constructor(
    addNote: (note: T.Note) => any,
    options,
    recordEvent: (eventName: string, eventProperties: T.JSONSerializable) => any
  ) {
    super();
    this.addNote = addNote;
    this.options = options;
    this.recordEvent = recordEvent;
  }

  importNotes = (filesArray) => {
    if (!filesArray || filesArray.length === 0) {
      this.emit('status', 'error', 'Invalid Evernote export file.');
      return;
    }

    // We will always process only the first item in the array
    const file = filesArray[0];
    if (!file || !file.path) {
      this.emit('status', 'error', 'Could not find Evernote export file.');
      return;
    }

    if (!file.path || !endsWith(file.path.toLowerCase(), '.enex')) {
      this.emit('status', 'error', 'An Evernote .enex file is required.');
      return;
    }

    const coreImporter = new CoreImporter(this.addNote);
    let importedNoteCount = 0;

    const addNotesToApp = (response) => {
      if (response.error) {
        this.emit('status', 'error', 'Error processing Evernote data.');
        window.electron?.removeListener('noteImportChannel');
        return;
      }
      if (response.note) {
        importedNoteCount++;
        this.emit('status', 'progress', importedNoteCount);
        coreImporter.importNote(response.note, this.options);
        return;
      }
      if (response.complete) {
        if (importedNoteCount === 0) {
          this.emit('status', 'error', 'No notes were found to import.');
          window.electron?.removeListener('noteImportChannel');
          return;
        }
        this.emit('status', 'complete', importedNoteCount);
        this.recordEvent('importer_import_completed', {
          source: 'evernote',
          note_count: importedNoteCount,
        });
        window.electron?.removeListener('noteImportChannel');
      }
    };

    window.electron?.receive('noteImportChannel', addNotesToApp);
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
