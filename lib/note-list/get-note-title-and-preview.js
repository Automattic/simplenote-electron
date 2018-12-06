import getNoteExcerpt from '../utils/note-utils';

/** @type {Map} stores a cache of computed note preview excerpts to prevent re-truncating note content */
const noteCache = new Map();

/**
 * Caches based on note id
 *
 * @param {Function} getKey Get the key used for invalidating the cache
 * @param {Function} getValue Get the value for the cache
 * @returns {Object} note title and preview excerpt
 */
const withCache = (getKey, getValue) => note => {
  let cached = noteCache.get(note.id);
  const key = getKey(note);

  if ('undefined' === typeof cached || key !== cached[0]) {
    noteCache.set(note.id, [key, getValue(note)]);
    cached = noteCache.get(note.id);
  }
  return cached[1];
};

export default withCache(note => note.data.modificationDate, getNoteExcerpt);
