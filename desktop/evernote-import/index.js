const { createStream } = require('sax');
const { JSDOM } = require('jsdom');
const { parseISO } = require('date-fns/parseISO');
const { endsWith, get } = require('lodash');
const fs = require('fs');
const enmlToMarkdown = require('./enml-to-markdown');

const getConvertedDate = (dateString) => {
  let convertedDate = parseISO(dateString).getTime() / 1000;
  if (isNaN(convertedDate)) {
    // Fall back to current date
    convertedDate = Date.now() / 1000;
  }

  return convertedDate;
};

const importNotes = (filePath, mainWindow) => {
  if (!filePath || !endsWith(filePath.toLowerCase(), '.enex')) {
    return;
  }

  const saxStream = createStream(true, false);
  let currentNote = {}; // The current note we are parsing

  saxStream.on('error', function () {
    mainWindow.webContents.send('noteImportChannel', { error: true });
  });

  saxStream.on('opentag', (node) => {
    // The <note> tag signifies that we should parse another note
    if (node.name === 'note') {
      currentNote = { tags: [] };
    }
  });

  saxStream.on('cdata', (text) => {
    // Note content in evernote exports lives in CDATA
    const htmlDoc = new JSDOM(text);
    // We're only interested in 'note' doctypes, like 'en-note'
    if (!endsWith(get(htmlDoc, 'window.document.doctype.name', ''), 'note')) {
      return;
    }
    const strippedText = enmlToMarkdown(
      htmlDoc.window.document.querySelector('body').innerHTML
    );
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
        currentNote.creationDate = getConvertedDate(text);
        break;
      case 'updated':
        currentNote.modificationDate = getConvertedDate(text);
        break;
      case 'tag':
        currentNote.tags.push(text);
    }
  });

  saxStream.on('closetag', (node) => {
    // Add the currentNote to the array
    if (node === 'note') {
      mainWindow.webContents.send('noteImportChannel', { note: currentNote });
    }
  });

  saxStream.on('end', () => {
    mainWindow.webContents.send('noteImportChannel', { complete: true });
  });

  // Read the file via stream
  fs.createReadStream(filePath).pipe(saxStream);
};

module.exports = importNotes;
