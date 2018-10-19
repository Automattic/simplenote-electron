import { isEmpty, get, pick } from 'lodash';

const propertyWhitelist = [
  'content',
  'creationDate',
  'lastModified',
  'modificationDate',
  'pinned',
  'tags',
  'deleted',
];

const importNotes = (notes = {}, noteBucket, tagBucket) => {
  if (isEmpty(notes)) {
    throw new Error('No notes to import.');
  }

  if (!notes.activeNotes && !notes.trashedNotes) {
    throw new Error('Invalid import format: No active or trashed notes found.');
  }

  const importNote = (note, isTrashedNotes = false) => {
    const importedNote = pick(note, propertyWhitelist);

    // We don't want to allow these properties to be imported, but they need to be set
    importedNote.publishURL = '';
    importedNote.shareURL = '';

    importedNote.systemTags = get(importedNote, 'systemTags', []);
    importedNote.deleted = isTrashedNotes;

    // Accout for Simplenote's exported `lastModified` date. Convert to timestamp
    if (importedNote.lastModified && isNaN(importedNote.lastModified)) {
      importedNote.modificationDate = Date.parse(importedNote.lastModified);
      delete importedNote.lastModified;
    }

    if (importedNote.creationDate && isNaN(importedNote.creationDate)) {
      importedNote.creationDate = Date.parse(importedNote.creationDate);
    }

    // Add the tags to the tag bucket
    if (importedNote.tags) {
      importedNote.tags.map(tagName => {
        if (isEmpty(tagName)) {
          return;
        }
        // We use update() to set the id of the tag (as well as the name prop)
        tagBucket.update(tagName, { name: tagName });
      });
    }

    noteBucket.add(importedNote);
  };

  get(notes, 'activeNotes', []).map(note => importNote(note));
  get(notes, 'trashedNotes', []).map(note => importNote(note, true));
};

export default importNotes;
