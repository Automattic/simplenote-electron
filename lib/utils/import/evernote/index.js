const fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
import { createStream } from 'sax';
import moment from 'moment';
import importNotes from '../';
import { endsWith, get } from 'lodash';

const importEvernotes = (filePath, noteBucket, tagBucket) => {
  if (!filePath || !endsWith(filePath.toLowerCase(), '.enex')) {
    // TODO return error message here to UI;
    return;
  }

  const saxStream = createStream(true, false);
  const parser = new DOMParser();
  let importedNotes = []; // The array of imported notes
  let currentNote = {}; // The current note we are parsing

  saxStream.on('error', function() {
    // TODO return error message here to UI;
  });

  saxStream.on('opentag', function(node) {
    // The <note> tag signifies that we should parse another note
    if (node.name === 'note') {
      currentNote = { tags: [] };
    }
  });

  saxStream.on('cdata', function(text) {
    // Note content in evernote exports lives in CDATA
    const htmlDoc = parser.parseFromString(text, 'text/xml');

    // We're only interested in 'note' doctypes, like 'en-note'
    if (!endsWith(get(htmlDoc, 'doctype.name', ''), 'note')) {
      return;
    }

    const strippedText = htmlToPlainText(htmlDoc.documentElement);
    if (strippedText !== '') {
      currentNote.content += '\n' + strippedText;
    }
  });

  saxStream.on('text', function(text) {
    const tagName = saxStream._parser.tagName;
    switch (tagName) {
      case 'title':
        // Evernote titles appear to be plain text only, we can take it as-is
        currentNote.content = text;
        break;
      // We need to convert the date to a Unix timestamp
      case 'created':
        currentNote.creationDate = getConvertedDate(text);
        break;
      case 'updated':
        currentNote.modificationDate = getConvertedDate(text);
        break;
      case 'tag':
        currentNote.tags.push(text);
    }
  });

  saxStream.on('closetag', function(node) {
    // Add the currentNote to the array
    if (node === 'note') {
      importedNotes.push(currentNote);
    }
  });

  saxStream.on('end', function() {
    if (importedNotes.length === 0) {
      // TODO: How do we report back about failures/no notes found?
      return;
    }

    // Insert notes into object that matches Simplenote import format
    const notesObject = { activeNotes: importedNotes };
    // Import them!
    importNotes(notesObject, noteBucket, tagBucket);
  });

  // Read the file via stream
  fs.createReadStream(filePath).pipe(saxStream);
};

const getConvertedDate = dateString => {
  let convertedDate = moment(dateString).unix();
  if (isNaN(convertedDate)) {
    // Fall back to current date
    convertedDate = Date.now();
  }

  return convertedDate;
};

// From: https://stackoverflow.com/a/44952893
// Modified to work properly with Evernote HTML formatting
const htmlToPlainText = (n, isInnerNode) => {
  let plainText = '';
  // Skip `media` tags (like <en-media>)
  if (endsWith(n.nodeName, 'media')) {
    return '';
  }

  if (n.nodeType === 3) {
    plainText = n.nodeValue;
  } else {
    let partial = '';
    if (
      (isInnerNode && n.nodeName === 'div') ||
      n.nodeName === 'ul' ||
      n.nodeName === 'li'
    ) {
      partial += '\n';
    }

    for (let i = 0; i < n.childNodes.length; i++) {
      partial += htmlToPlainText(n.childNodes[i], true);
    }
    plainText = partial;
  }

  return plainText;
};

export default importEvernotes;
