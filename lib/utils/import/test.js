import CoreImporter from './';

describe('Importer', () => {
  let importer;

  beforeEach(() => {
    importer = new CoreImporter({ noteBucket: {}, tagBucket: {} });
    importer.emit = jest.fn();
  });

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
