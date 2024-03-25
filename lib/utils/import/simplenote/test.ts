import SimplenoteImporter, { convertModificationDates } from './';
import CoreImporter from '../';
jest.mock('../');

describe('SimplenoteImporter', () => {
  let importer;

  beforeEach(() => {
    importer = new SimplenoteImporter(() => {});
    importer.emit = jest.spyOn(importer, 'emit');
    CoreImporter.mockClear();
    CoreImporter.mockImplementation(function () {
      this.importNotes = jest.fn(() => ({
        then: (callback) => callback(),
      }));
    });
  });

  it('should emit error when no notes are passed', () => {
    importer.importNotes();
    expect(importer.emit).toHaveBeenCalledWith(
      'status',
      'error',
      'No file to import.'
    );
  });

  it.skip('should call coreImporter.importNotes with all notes and options', () => {
    return new Promise((done) => {
      const notes = {
        activeNotes: [{}, {}],
        trashedNotes: [{}],
      };
      importer.on('status', () => {
        const args = CoreImporter.mock.instances[0].importNotes.mock.calls[0];
        expect(args[0].activeNotes).toHaveLength(2);
        expect(args[0].trashedNotes).toHaveLength(1);
        expect(args[1].foo).toBe(true);
        done();
      });
      importer.importNotes([new File([JSON.stringify(notes)], 'foo.json')]);
    });
  });

  describe('convertModificationDates', () => {
    it('should convert `lastModified` ISO strings to `modificationDate` Unix timestamps', () => {
      const processedNotes = convertModificationDates([
        {
          lastModified: '2018-10-15T14:09:10.382Z',
          otherProp: 'value',
        },
        {
          modificationDate: '1539612550',
          otherProp: 'value',
        },
      ]);
      expect(processedNotes).toEqual([
        {
          modificationDate: 1539612550.382,
          otherProp: 'value',
        },
        {
          modificationDate: '1539612550',
          otherProp: 'value',
        },
      ]);
    });

    it('should not add undefined properties', () => {
      const processedNotes = convertModificationDates([{}]);
      expect(Object.keys(processedNotes[0])).toHaveLength(0);
    });
  });
});
