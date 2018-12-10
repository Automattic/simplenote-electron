import removeMarkdown from 'remove-markdown';

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

// Ample amount of characters for 'Expanded' list view
const characterLimit = 300;

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
  let content = (note && note.data && note.data.content) || '';
  content = content.substring(0, characterLimit);

  const match = isMarkdown(note)
    ? noteTitleAndPreviewMdRegExp.exec(content || '')
    : noteTitleAndPreviewRegExp.exec(content || '');

  if (!match) {
    return defaults;
  }

  let [, title, preview] = match;

  if (preview && isMarkdown(note)) {
    // Workaround for a bug in `remove-markdown`
    // See https://github.com/stiang/remove-markdown/issues/35
    const previewWithSpacesTrimmed = preview.replace(/(\s)\s+/g, '$1');

    preview = removeMarkdown(previewWithSpacesTrimmed, {
      stripListLeaders: false,
    });
  }

  return {
    title: title.slice(0, 200) || defaults.title,
    preview: preview || defaults.preview,
  };
};

export const isMarkdown = note => {
  return note && note.data && note.data.systemTags.includes('markdown');
};

export default noteTitleAndPreview;
