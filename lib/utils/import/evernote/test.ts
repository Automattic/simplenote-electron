import EvernoteImporter from './';

describe('EvernoteImporter', () => {
  describe('getConvertedDate', () => {
    let dateNowSpy;
    let importer;

    beforeAll(() => {
      dateNowSpy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => 1542312140788);
    });

    beforeEach(() => {
      importer = new EvernoteImporter({ noteBucket: {}, tagBucket: {} });
    });

    afterAll(() => {
      dateNowSpy.mockRestore();
    });

    it('should return a Unix timestamp, given an un-delimited ISO string', () => {
      const convertedDate = importer.getConvertedDate('20181008T172440Z');
      expect(convertedDate).toBe(1539019480);
    });

    it('should fall back to the current Unix timestamp', () => {
      const fallbackDate = importer.getConvertedDate('broken-timestamp');
      expect(fallbackDate).toBe(1542312140.788);
    });
  });
});
