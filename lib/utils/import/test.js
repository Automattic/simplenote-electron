import CoreImporter from './';

describe('CoreImporter', () => {
  let importer;
  let noteBucketAdd = jest.fn();

  beforeEach(() => {
    importer = new CoreImporter({
      noteBucket: {
        add: noteBucketAdd,
      },
      tagBucket: {},
    });
    importer.emit = jest.fn();
  });

  describe('importNote', () => {
    it('should call noteBucket.add() with a note containing the required properties', () => {
      const note = {};
      importer.importNote(note);

      const passedNote = noteBucketAdd.mock.calls[0][0];

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
      expect(importer.emit).toBeCalledWith(
        'status',
        'error',
        'No notes to import.'
      );
    });

    it('should emit error when invalid object is passed', () => {
      const bogusNotes = { actveNotes: [] };
      importer.importNotes(bogusNotes);
      expect(importer.emit).toBeCalledWith(
        'status',
        'error',
        'Invalid import format: No active or trashed notes found.'
      );
    });
  });
});
