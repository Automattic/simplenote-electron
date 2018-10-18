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

const importNotes = (notes = {}, noteBucket) => {
  if (isEmpty(notes)) {
    throw new Error('No notes to import.');
  }

  if (!notes.activeNotes && !notes.trashedNotes) {
    throw new Error('Invalid import format: No active or trashed notes found.');
  }

  const importNote = note => {
    const importedNote = pick(note, propertyWhitelist);

    // We don't want to allow these properties to be imported, but they need to be set
    importedNote.publishURL = '';
    importedNote.shareURL = '';
    importedNote.systemTags = get(importedNote, 'systemTags', []);

    importedNote.deleted = get(importedNote, 'deleted', false);

    // Accout for Simplenote's exported `lastModified` date. Convert to timestamp
    if (importedNote.lastModified) {
      importedNote.modificationDate = Date.parse(importedNote.lastModified);
      delete importedNote.lastModified;
    }

    if (importedNote.creationDate) {
      importedNote.creationDate = Date.parse(importedNote.creationDate);
    }

    noteBucket.add(importedNote);
  };

  get(notes, 'activeNotes', []).map(note => importNote(note));
  get(notes, 'trashedNotes', []).map(note => importNote(note));
};

export default importNotes;
