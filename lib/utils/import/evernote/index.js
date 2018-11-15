import { EventEmitter } from 'events';
import { createStream } from 'sax';
import moment from 'moment';
import CoreImporter from '../';
import { endsWith, get, has } from 'lodash';

let fs = null;
const isElectron = has(window, 'process.type');
if (isElectron) {
  fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
}

class EvernoteImporter extends EventEmitter {
  constructor({ noteBucket, tagBucket, options }) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
    this.options = options;
  }

  importNotes = filesArray => {
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
    const coreImporter = new CoreImporter({
      noteBucket: this.noteBucket,
      tagBucket: this.tagBucket,
    });
    let currentNote = {}; // The current note we are parsing
    let importedNoteCount = 0;

    saxStream.on('error', function() {
      this.emit('status', 'error', 'Error processing Evernote data.');
    });

    saxStream.on('opentag', node => {
      // The <note> tag signifies that we should parse another note
      if (node.name === 'note') {
        currentNote = { tags: [] };
      }
    });

    saxStream.on('cdata', text => {
      // Note content in evernote exports lives in CDATA
      const htmlDoc = parser.parseFromString(text, 'text/html');

      // We're only interested in 'note' doctypes, like 'en-note'
      if (!endsWith(get(htmlDoc, 'doctype.name', ''), 'note')) {
        return;
      }

      const strippedText = this.htmlToPlainText(htmlDoc.documentElement);
      if (strippedText !== '') {
        currentNote.content += '\n' + strippedText;
      }
    });

    saxStream.on('text', text => {
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

    saxStream.on('closetag', node => {
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

  getConvertedDate = dateString => {
    let convertedDate = moment(dateString).unix();
    if (isNaN(convertedDate)) {
      // Fall back to current date
      convertedDate = moment().unix();
    }

    return convertedDate;
  };

  // From: https://stackoverflow.com/a/44952893
  // Modified to work properly with Evernote HTML formatting
  htmlToPlainText = (n, isInnerNode) => {
    const self = this;
    let plainText = '';
    // Skip `media` tags (like <en-media>)
    if (endsWith(n.nodeName, 'media')) {
      return '';
    }

    if (n.nodeType === 3) {
      plainText = n.nodeValue;
    } else {
      let partial = '';
      const nodeName = n.nodeName.toLowerCase();
      if (
        (isInnerNode && nodeName === 'div') ||
        nodeName.match(/h[1-6]/g) ||
        nodeName === 'p' ||
        nodeName === 'ul' ||
        nodeName === 'li' ||
        nodeName === 'br'
      ) {
        partial += '\n';
      }

      for (let i = 0; i < n.childNodes.length; i++) {
        partial += self.htmlToPlainText(n.childNodes[i], true);
      }
      plainText = partial;
    }

    return plainText;
  };
}

export default EvernoteImporter;
