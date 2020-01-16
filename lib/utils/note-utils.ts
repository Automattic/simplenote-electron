import removeMarkdown from 'remove-markdown';
import { isFunction } from 'lodash';

import * as T from '../types';

export interface TitleAndPreview {
  title: string;
  preview: string;
}

export const maxTitleChars = 64;
export const maxPreviewChars = 200;
const maxPreviewLines = 4; // probably need to adjust if we're in the comfy view

const matchUntilLimit = (pattern, source, preview = '', lines = 0) => {
  const match = pattern.exec(source);
  // must match, must have no more than four lines, must not be longer than N=10 characters
  if (!match || lines > maxPreviewLines || preview.length > maxPreviewChars) {
    return preview;
  }

  const [, chunk] = match;
  return matchUntilLimit(pattern, source, preview + chunk, lines + 1);
};

/**
 * Returns a string with markdown stripped
 *
 * @param {String} inputString string for which to remove markdown
 * @returns {String} string with markdown removed
 */
const removeMarkdownWithFix = inputString => {
  // Workaround for a bug in `remove-markdown`
  // See https://github.com/stiang/remove-markdown/issues/35
  return removeMarkdown(inputString.replace(/(\s)\s+/g, '$1'), {
    stripListLeaders: false,
  });
};

const getTitle = content => {
  const titlePattern = new RegExp(`\\s*([^\n]{1,${maxTitleChars}})`, 'g');
  const titleMatch = titlePattern.exec(content);
  if (!titleMatch) {
    return 'New Note…';
  }
  const [, title] = titleMatch;
  return title;
};

const getPreview = content => {
  const previewPattern = new RegExp(
    `[^\n]*\n+[ \t]*([^]{0,${maxPreviewChars}})`,
    'g'
  );
  return matchUntilLimit(previewPattern, content);
};

const formatPreview = (stripMarkdown: boolean, s: string): string =>
  stripMarkdown ? removeMarkdownWithFix(s) || s : s;

/**
 * Returns the title and excerpt for a given note
 *
 * @param {Object} note a note object
 * @returns {Object} title and excerpt (if available)
 */
export const noteTitleAndPreview = (note: T.NoteEntity): TitleAndPreview => {
  const content = (note && note.data && note.data.content) || '';
  const stripMarkdown = isMarkdown(note);
  const title = formatPreview(stripMarkdown, getTitle(content));
  const preview = formatPreview(stripMarkdown, getPreview(content));
  return { title, preview };
};

function isMarkdown(note: T.NoteEntity): boolean {
  return note && note.data && note.data.systemTags.includes('markdown');
}

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
