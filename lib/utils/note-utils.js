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
 * Returns the title and excerpt for a given note
 *
 * @param {Object} note a note object
 * @returns {Object} title and excerpt (if available)
 */
export const noteTitleAndPreview = note => {
  let content = (note && note.data && note.data.content) || '';
  content = isMarkdown(note)
    ? removeMarkdown(content, { stripListLeaders: false })
    : content;

  const match = noteTitleAndPreviewRegExp.exec(content);

  const defaults = {
    title: 'New Note...',
    preview: '',
  };

  if (!match) {
    return defaults;
  }

  const [, title, preview] = match;

  return {
    title: title.slice(0, 200) || defaults.title,
    preview: preview || defaults.preview,
  };
};

export const isMarkdown = note => {
  return note && note.data && note.data.systemTags.includes('markdown');
};

export default noteTitleAndPreview;
