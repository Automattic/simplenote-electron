import removeMarkdown from 'remove-markdown';
import { isFunction } from 'lodash';

/**
 * Matches the title and excerpt in a note's content
 *
 * Both the title and the excerpt are determined as
 * content starting with something that isn't
 * whitespace and leads up to a newline or line end
 *
 * @type {RegExp} matches a title and excerpt in note content
 */
const noteTitleAndPreviewRegExp = /\s*(\S[^\n]*)\s*(\S[^\n]*)?/;

/**
 * Matches the title and excerpt in a note's content skipping opening # from title
 *
 * Both the title and the excerpt are determined as
 * content starting with something that isn't
 * whitespace and leads up to a newline or line end
 *
 * @type {RegExp} matches a title and excerpt in note content skipping opening #'s from title and preview
 */
const noteTitleAndPreviewMdRegExp = /(?:#{0,6}\s+)?(\S[^\n]*)\s*(?:#{0,6}\s+)?(\S[^\n]*)?/;

export const titleCharacterLimit = 200;

// Ample amount of characters for the 'Expanded' list view
export const previewCharacterLimit = 300;

// Defaults for notes with empty content
export const defaults = {
  title: 'New Note...',
  preview: '',
};

/**
 * Returns the title and excerpt for a given note
 *
 * @param {Object} note a note object
 * @returns {Object} title and excerpt (if available)
 */
export const noteTitleAndPreview = note => {
  const content = (note && note.data && note.data.content) || '';

  const match = isMarkdown(note)
    ? noteTitleAndPreviewMdRegExp.exec(content || '')
    : noteTitleAndPreviewRegExp.exec(content || '');

  if (!match) {
    return defaults;
  }

  let [, title = defaults.title, preview = defaults.preview] = match;

  title = title.slice(0, titleCharacterLimit);
  preview = preview.slice(0, previewCharacterLimit);

  if (preview && isMarkdown(note)) {
    // Workaround for a bug in `remove-markdown`
    // See https://github.com/stiang/remove-markdown/issues/35
    const previewWithSpacesTrimmed = preview.replace(/(\s)\s+/g, '$1');

    preview = removeMarkdown(previewWithSpacesTrimmed, {
      stripListLeaders: false,
    });
  }

  return { title, preview };
};

export const isMarkdown = note => {
  return note && note.data && note.data.systemTags.includes('markdown');
};

/**
 * Clean the text so it is ready to be sorted alphabetically.
 *
 * @param {string} text - The string to be normalized.
 * @returns {string} The normalized string.
 */
export const normalizeForSorting = text => {
  const maxLength = 200;

  let normalizedText = text
    .replace(/^\s*#+\s*/, '') // Remove leading whitespace and Markdown heading
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .toLowerCase();

  // Remove accents/diacritics (https://stackoverflow.com/questions/990904)
  // if `normalize()` is available.
  if (isFunction(normalizedText.normalize)) {
    normalizedText = normalizedText
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  return normalizedText;
};

export default noteTitleAndPreview;
