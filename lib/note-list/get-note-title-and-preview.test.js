import { clearCache, withCache } from './get-note-title-and-preview';

describe('getNoteTitleAndPreview', () => {
  describe('withCache', () => {
    const getKey = note => note.mockKey;

    afterEach(() => {
      clearCache();
    });

    it('should only call getValue() when necessary', () => {
      const getValue = jest.fn();

      withCache(getKey, getValue)({ id: 0, mockKey: 'foo' }); // should call
      withCache(getKey, getValue)({ id: 0, mockKey: 'foo' }); // shouldn't call
      expect(getValue).toHaveBeenCalledTimes(1);
      withCache(getKey, getValue)({ id: 0, mockKey: 'bar' }); // should call
      expect(getValue).toHaveBeenCalledTimes(2);
    });

    it('should return the cached value', () => {
      const getValue = jest.fn().mockReturnValueOnce('mock value');

      withCache(getKey, getValue)({ id: 0, mockKey: 'foo' });
      const result = withCache(getKey, getValue)({ id: 0, mockKey: 'foo' });
      expect(result).toBe('mock value');
    });

    it('should return an updated value when cache is invalidated', () => {
      const getValue = jest
        .fn()
        .mockReturnValueOnce('initial value')
        .mockReturnValueOnce('changed value');

      withCache(getKey, getValue)({ id: 0, mockKey: 'foo' });
      const result = withCache(getKey, getValue)({ id: 0, mockKey: 'bar' });
      expect(result).toBe('changed value');
    });
  });
});
