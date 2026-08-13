import removeMarkdown from 'remove-markdown';
import { escapeRegExp } from 'lodash';
import { getTerms } from './filter-notes';

import * as T from './types';

export interface TitleAndPreview {
  title: string;
  preview: string;
}

export const maxTitleChars = 64;
export const maxPreviewChars = 200;
export const MAX_PREVIEW_CACHE_ENTRIES = 1000;

export interface BoundedCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
}

/**
 * Creates a Map-backed cache that evicts the oldest insertion once it exceeds
 * `maxEntries`. Map iterates in insertion order, so deleting the first key is
 * an O(1) bounded-cache (a simple LRU approximation; entries are never
 * re-inserted on read, which is fine for one-shot CLI command lifetimes).
 */
export function createBoundedCache<V>(maxEntries: number): BoundedCache<V> {
  const store = new Map<string, V>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
      if (store.size > maxEntries) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) {
          store.delete(oldest);
        }
      }
    },
  };
}

const isLowSurrogate = (c: number) => 0xdc00 <= c && c <= 0xdfff;

/**
 * Returns a string with markdown stripped
 *
 * @param {String} inputString string for which to remove markdown
 * @returns {String} string with markdown removed
 */
const removeMarkdownWithFix = (inputString: string) => {
  // Workaround for a bug in `remove-markdown`
  // See https://github.com/stiang/remove-markdown/issues/35
  return removeMarkdown(inputString.replace(/(\s)\s+/g, '$1'), {
    stripListLeaders: false,
  } as Parameters<typeof removeMarkdown>[1]);
};

export const getTitle = (content: string) => {
  const titlePattern = new RegExp(`\\s*([^\n]{1,${maxTitleChars}})`, 'g');
  const titleMatch = titlePattern.exec(content);
  if (!titleMatch) {
    return 'New Note…';
  }
  const [, title] = titleMatch;
  return title;
};

type ContextualMatcher = {
  terms: string[];
  regExp: RegExp | undefined;
};

// Rebuilding the same regex for every note of one search is pure waste: the
// query is identical across all hits, and the regex has no /g flag, so
// reusing it cannot leak lastIndex state between notes. Keyed by the raw
// query string; a CLI command lifetime sees a handful of distinct queries.
const contextualMatchers = createBoundedCache<ContextualMatcher>(
  MAX_PREVIEW_CACHE_ENTRIES
);

function contextualMatcherFor(query: string): ContextualMatcher {
  const cached = contextualMatchers.get(query);
  if (cached !== undefined) {
    return cached;
  }
  const terms = getTerms(query);
  let regExp: RegExp | undefined;
  // use only the first term of a multi-term query
  if (terms.length > 0) {
    const firstTerm = terms[0].toLowerCase();
    // A single term longer than 30 chars would make `leadingChars` negative
    // and the quantifier `{0,-N}` an illegal regexp — a search for such a word
    // crashed with a SyntaxError that surfaced as a network error (exit 3).
    const leadingChars = Math.max(0, 30 - firstTerm.length);

    // prettier-ignore
    regExp = new RegExp(
      '(?:\\s|^)[^\n]' + // split at a word boundary (pattern must be preceded by whitespace or beginning of string)
        '{0,' + leadingChars + '}' + // up to leadingChars of text before the match
        escapeRegExp(firstTerm) +
        '.{0,200}(?=\\s|$)', // up to 200 characters of text after the match, splitting at a word boundary
      'ims'
    );
  }
  const value = { terms, regExp };
  contextualMatchers.set(query, value);
  return value;
}

/**
 * Generate preview for note list
 *
 * Should gather the first non-whitespace content
 * for up to three lines and up to 200 characters
 *
 * @param content
 */
const getPreview = (content: string, searchQuery?: string) => {
  let preview = '';
  let lines = 0;

  // contextual note previews
  if (searchQuery?.trim()) {
    const { terms, regExp } = contextualMatcherFor(searchQuery);

    if (terms.length > 0 && regExp !== undefined) {
      const matches = regExp.exec(content);
      if (matches && matches.length > 0) {
        // Remove blank lines and note title from the search note preview
        preview = matches[0]
          .split('\n')
          .filter(
            (line) => line !== '\r' && line !== '' && line !== getTitle(content)
          )
          .join('\n');
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

const previewCache = createBoundedCache<[TitleAndPreview, boolean, string?]>(
  MAX_PREVIEW_CACHE_ENTRIES
);

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
