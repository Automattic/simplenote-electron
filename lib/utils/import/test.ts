import CoreImporter from './';

describe('CoreImporter', () => {
  let importer;
  const addNote = jest.fn();

  beforeEach(() => {
    importer = new CoreImporter(addNote);
    importer.emit = jest.fn();
  });

  describe('importNote', () => {
    it('should call addNote() with a note containing the required properties', () => {
      const note = {};
      importer.importNote(note);

      const passedNote = addNote.mock.calls[0][0];

      // Conforms to schema
      expect(passedNote.publishURL).toBe('');
      expect(passedNote.shareURL).toBe('');
      expect(passedNote.deleted).toBe(false);
      expect(passedNote.tags).toEqual([]);
      expect(passedNote.systemTags).toEqual([]);
      expect(passedNote.creationDate).toEqual(expect.any(Number));
      expect(passedNote.modificationDate).toEqual(expect.any(Number));
      expect(passedNote.content).toBe('');
    });
  });

  describe('importNotes', () => {
    it('should emit error when no notes are passed', () => {
      importer.importNotes();
      expect(importer.emit).toHaveBeenCalledWith(
        'status',
        'error',
        'No notes to import.'
      );
    });

    it('should emit error when invalid object is passed', () => {
      const bogusNotes = { actveNotes: [] };
      importer.importNotes(bogusNotes);
      expect(importer.emit).toHaveBeenCalledWith(
        'status',
        'error',
        'Invalid import format: No active or trashed notes found.'
      );
    });
  });
});
