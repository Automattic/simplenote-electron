import removeMarkdown from 'remove-markdown';
import { escapeRegExp } from 'lodash';
import { getTerms } from './filter-notes';

import * as T from '../types';

export interface TitleAndPreview {
  title: string;
  preview: string;
}

export const maxTitleChars = 64;
export const maxPreviewChars = 200;

const isLowSurrogate = (c: number) => 0xdc00 <= c && c <= 0xdfff;

/**
 * Returns a string with markdown stripped
 *
 * @param {String} inputString string for which to remove markdown
 * @returns {String} string with markdown removed
 */
const removeMarkdownWithFix = (inputString) => {
  // Workaround for a bug in `remove-markdown`
  // See https://github.com/stiang/remove-markdown/issues/35
  return removeMarkdown(inputString.replace(/(\s)\s+/g, '$1'), {
    stripListLeaders: false,
  });
};

export const getTitle = (content) => {
  const titlePattern = new RegExp(`\\s*([^\n]{1,${maxTitleChars}})`, 'g');
  const titleMatch = titlePattern.exec(content);
  if (!titleMatch) {
    return 'New Note…';
  }
  const [, title] = titleMatch;
  return title;
};

/**
 * Generate preview for note list
 *
 * Should gather the first non-whitespace content
 * for up to four lines and up to 200 characters
 *
 * @param content
 */
const getPreview = (content: string, searchQuery?: string) => {
  let preview = '';
  let lines = 0;

  // contextual note previews
  if (searchQuery?.trim()) {
    const terms = getTerms(searchQuery);

    // use only the first term of a multi-term query
    if (terms.length > 0) {
      const firstTerm = terms[0].toLocaleLowerCase();
      const leadingChars = 30 - firstTerm.length;

      // prettier-ignore
      const regExp = new RegExp(
        '(?:\\s|^)[^\n]' + // split at a word boundary (pattern must be preceded by whitespace or beginning of string)
          '{0,' + leadingChars + '}' + // up to leadingChars of text before the match
          escapeRegExp(firstTerm) +
          '.{0,200}(?=\\s|$)', // up to 200 characters of text after the match, splitting at a word boundary
        'ims'
      );
      const matches = regExp.exec(content);
      if (matches && matches.length > 0) {
        preview = matches[0];

        // don't return half of a surrogate pair
        return isLowSurrogate(preview.charCodeAt(0))
          ? preview.slice(1)
          : preview;
      }
    }
  }

  // implicit else: if the query didn't match, fall back to first three lines
  let index = content.indexOf('\n');

  if (index === -1) {
    return '';
  }

  while (index > -1 && lines < 3) {
    const nextNewline = content.indexOf('\n', index);
    if (-1 === nextNewline) {
      return preview + content.slice(index).trim();
    }

    const nextLine = content.slice(index, nextNewline).trim();
    if (nextLine) {
      preview += nextLine + '\n';
      lines++;
    }

    index = nextNewline + 1;
  }

  return preview.trim();
};

const formatPreview = (stripMarkdown: boolean, s: string): string =>
  stripMarkdown ? removeMarkdownWithFix(s) || s : s;

const previewCache = new Map<string, [TitleAndPreview, boolean, string?]>();

/**
 * Returns the title and excerpt for a given note
 *
 * @param note generate the previews for this note
 * @returns title and excerpt (if available)
 */
export const noteTitleAndPreview = (
  note: T.Note,
  searchQuery?: string
): TitleAndPreview => {
  const stripMarkdown = isMarkdown(note);
  const cached = previewCache.get(note.content);
  if (cached) {
    const [value, wasMarkdown, savedQuery] = cached;
    if (wasMarkdown === stripMarkdown && savedQuery === searchQuery) {
      return value;
    }
  }

  const content = note.content || '';
  const title = formatPreview(stripMarkdown, getTitle(content));
  const preview = formatPreview(
    stripMarkdown,
    getPreview(content, searchQuery)
  );
  const result = { title, preview };

  previewCache.set(note.content, [result, stripMarkdown, searchQuery]);

  return result;
};

function isMarkdown(note: T.Note): boolean {
  return note.systemTags.includes('markdown');
}

export default noteTitleAndPreview;
