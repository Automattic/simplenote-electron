import { EventEmitter } from 'events';
import { createStream } from 'sax';
import { isElectron } from '../../platform';
import parseISO from 'date-fns/parseISO';
import { endsWith, get } from 'lodash';

import CoreImporter from '../';
import enmlToMarkdown from './enml-to-markdown';

import * as T from '../../../types';

let fs = null;

if (isElectron) {
  fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
}

class EvernoteImporter extends EventEmitter {
  constructor(addNote: (note: T.Note) => any, options) {
    super();
    this.addNote = addNote;
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

    const saxStream = createStream(true, false);
    const parser = new DOMParser();
    const coreImporter = new CoreImporter(this.addNote);
    let currentNote = {}; // The current note we are parsing
    let importedNoteCount = 0;

    saxStream.on('error', function () {
      this.emit('status', 'error', 'Error processing Evernote data.');
    });

    saxStream.on('opentag', (node) => {
      // The <note> tag signifies that we should parse another note
      if (node.name === 'note') {
        currentNote = { tags: [] };
      }
    });

    saxStream.on('cdata', (text) => {
      // Note content in evernote exports lives in CDATA
      const htmlDoc = parser.parseFromString(text, 'text/html');

      // We're only interested in 'note' doctypes, like 'en-note'
      if (!endsWith(get(htmlDoc, 'doctype.name', ''), 'note')) {
        return;
      }

      const strippedText = enmlToMarkdown(htmlDoc.body.innerHTML);
      if (strippedText !== '') {
        currentNote.content += '\n' + strippedText;
      }
    });

    saxStream.on('text', (text) => {
      if (!text) {
        return;
      }

      const tagName = saxStream._parser.tagName;
      switch (tagName) {
        case 'title':
          // Evernote titles appear to be plain text only, we can take it as-is
          currentNote.content = text;
          break;
        // We need to convert the date to a Unix timestamp
        case 'created':
          currentNote.creationDate = this.getConvertedDate(text);
          break;
        case 'updated':
          currentNote.modificationDate = this.getConvertedDate(text);
          break;
        case 'tag':
          currentNote.tags.push(text);
      }
    });

    saxStream.on('closetag', (node) => {
      // Add the currentNote to the array
      if (node === 'note') {
        coreImporter.importNote(currentNote, this.options);
        importedNoteCount++;
        this.emit('status', 'progress', importedNoteCount);
      }
    });

    saxStream.on('end', () => {
      if (importedNoteCount === 0) {
        this.emit('status', 'error', 'No notes were found to import.');
        return;
      }

      this.emit('status', 'complete', importedNoteCount);
    });

    // Read the file via stream
    fs.createReadStream(file.path).pipe(saxStream);
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
