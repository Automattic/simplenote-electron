import importNotes from './';

describe('Importer', () => {
  it('should throw when no notes are passed', () => {
    expect(() => importNotes(null)).toThrow(/No notes to import./);
  });

  it('should throw when invalid json is passed', () => {
    const bogusNotes = { actveNotes: [] };
    expect(() => importNotes(bogusNotes)).toThrow(
      /Invalid import format: No active or trashed notes found./
    );
  });
});
