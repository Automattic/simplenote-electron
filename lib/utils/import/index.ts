import { EventEmitter } from 'events';
import { isEmpty, get, pick } from 'lodash';

import * as T from '../../types';

const propertyWhitelist = [
  'content',
  'creationDate',
  'deleted',
  'markdown',
  'modificationDate',
  'pinned',
  'tags',
];

class CoreImporter extends EventEmitter {
  constructor(addNote: (note: T.Note) => any) {
    super();
    this.addNote = addNote;
  }

  importNote = (note, { isTrashed = false, isMarkdown = false } = {}) => {
    const importedNote = pick(note, propertyWhitelist);
    // We don't want to allow these properties to be imported, but they need to be set
    importedNote.publishURL = '';
    importedNote.shareURL = '';

    importedNote.deleted = isTrashed;

    importedNote.tags = get(importedNote, 'tags', []);
    importedNote.systemTags = get(importedNote, 'systemTags', []);
    if (importedNote.pinned) {
      importedNote.systemTags.push('pinned');
      delete importedNote.pinned;
    }

    if (importedNote.markdown || isMarkdown) {
      importedNote.systemTags.push('markdown');
      delete importedNote.markdown;
    }

    if (importedNote.creationDate && isNaN(importedNote.creationDate)) {
      importedNote.creationDate =
        new Date(importedNote.creationDate).getTime() / 1000;
    }

    // Make sure that dates exist
    importedNote.creationDate =
      importedNote.creationDate || importedNote.modificationDate || Date.now();
    importedNote.modificationDate =
      importedNote.modificationDate || importedNote.creationDate || Date.now();

    // Make sure that content property exists
    if (!Object.prototype.hasOwnProperty.call(importedNote, 'content')) {
      importedNote.content = '';
    }

    // Add the tags to the tag bucket
    if (importedNote.tags) {
      importedNote.tags.map((tagName) => {
        if (isEmpty(tagName)) {
          return;
        }
      });
    }

    this.addNote(importedNote);
  };

  importNotes = (notes = {}, options) => {
    if (isEmpty(notes)) {
      this.emit('status', 'error', 'No notes to import.');
      return;
    }

    if (!notes.activeNotes && !notes.trashedNotes) {
      this.emit(
        'status',
        'error',
        'Invalid import format: No active or trashed notes found.'
      );
      return;
    }

    const activeNotesPromises = get(notes, 'activeNotes', []).map((note) =>
      this.importNote(note, options)
    );
    const trashedNotesPromises = get(notes, 'trashedNotes', []).map((note) =>
      this.importNote(note, { ...options, isTrashed: true })
    );

    return Promise.all(activeNotesPromises.concat(trashedNotesPromises));
  };
}

export default CoreImporter;
