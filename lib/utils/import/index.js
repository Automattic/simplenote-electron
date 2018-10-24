import { EventEmitter } from 'events';
import { isEmpty, get, pick } from 'lodash';

const propertyWhitelist = [
  'content',
  'creationDate',
  'deleted',
  'lastModified',
  'markdown',
  'modificationDate',
  'pinned',
  'tags',
];

class CoreImporter extends EventEmitter {
  constructor(noteBucket, tagBucket) {
    super();
    this.noteBucket = noteBucket;
    this.tagBucket = tagBucket;
  }

  importNote = (note, isTrashedNotes = false) => {
    const importedNote = pick(note, propertyWhitelist);
    // We don't want to allow these properties to be imported, but they need to be set
    importedNote.publishURL = '';
    importedNote.shareURL = '';

    importedNote.deleted = isTrashedNotes;

    importedNote.tags = get(importedNote, 'tags', []);
    importedNote.systemTags = get(importedNote, 'systemTags', []);
    if (importedNote.pinned) {
      importedNote.systemTags.push('pinned');
      delete importedNote.pinned;
    }

    if (importedNote.markdown) {
      importedNote.systemTags.push('markdown');
      delete importedNote.markdown;
    }

    // Accout for Simplenote's exported `lastModified` date. Convert to timestamp
    if (importedNote.lastModified && isNaN(importedNote.lastModified)) {
      importedNote.modificationDate =
        new Date(importedNote.lastModified).getTime() / 1000;
      delete importedNote.lastModified;
    }

    if (importedNote.creationDate && isNaN(importedNote.creationDate)) {
      importedNote.creationDate =
        new Date(importedNote.creationDate).getTime() / 1000;
    }

    // Add the tags to the tag bucket
    if (importedNote.tags) {
      importedNote.tags.map(tagName => {
        if (isEmpty(tagName)) {
          return;
        }
        // We use update() to set the id of the tag (as well as the name prop)
        this.tagBucket.update(tagName, { name: tagName });
      });
    }

    this.noteBucket.add(importedNote);
  };

  importNotes = (notes = {}) => {
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

    get(notes, 'activeNotes', []).map(note => this.importNote(note));
    get(notes, 'trashedNotes', []).map(note => this.importNote(note, true));
  };
}

export default CoreImporter;
