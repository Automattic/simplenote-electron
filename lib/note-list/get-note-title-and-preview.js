import noteTitle from '../utils/note-utils';

/** @type {Map} stores a cache of computed note preview excerpts to prevent re-truncating note content */
const noteCache = new Map();

/**
 * Caches based on note id and note content
 *
 * @param {Function} f sets the value of the cache
 * @returns {Object} note title and preview excerpt
 */
const noteTitleAndPreviewCache = f => note => {
  let cached = noteCache.get(note.id);

  if ('undefined' === typeof cached || note.data.content !== cached[0]) {
    noteCache.set(note.id, [note.data.content, f(note)]);
    cached = noteCache.get(note.id);
  }

  return {
    title: cached[1].title,
    preview: cached[1].preview,
  };
};

/**
 * Gets the note title and preview excerpt
 *
 * This is cached by the note id and content
 *
 * @function
 * @param {Object} note note object
 * @returns {Object} note title and preview excerpt
 */
const getNoteTitleAndPreview = noteTitleAndPreviewCache(note =>
  noteTitle(note)
);

export default getNoteTitleAndPreview;
