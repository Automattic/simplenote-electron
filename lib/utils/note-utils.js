/**
 * Matches the title and excerpt in a note's content
 *
 * Both the title and the excerpt are determined as
 * content starting with something that isn't
 * whitespace and leads up to a newline or line end
 *
 * @type {RegExp} matches a title and excerpt in note content
 */
const noteTitleAndPreviewRegExp = /()(\S[^\n]*)\s*(\S[^\n]*)?/;

/**
 * Matches the title and excerpt in a note's content skipping opening # from title
 *
 * Both the title and the excerpt are determined as
 * content starting with something that isn't
 * whitespace and leads up to a newline or line end
 * @type {RegExp} matches a title and excerpt in note content skipping opening # from title
 */
const noteTitleAndPreviewMdRegExp = /(#+ +)?(\S[^\n]*)\s*(\S[^\n]*)?/;

/**
 * Returns the title and excerpt for a given note
 *
 * @param {Object} note a note object
 * @returns {Object} title and excerpt (if available)
 */
export const noteTitleAndPreview = note => {
  const content = note && note.data && note.data.content;

  const match = isMarkdown(note)
    ? noteTitleAndPreviewMdRegExp.exec(content || '')
    : noteTitleAndPreviewRegExp.exec(content || '');

  const title = (match && match[2] && match[2].slice(0, 200)) || 'New note...';
  const preview = (match && match[3]) || '';

  return { title, preview };
};

export const isMarkdown = note => {
  return (
    note &&
    note.data &&
    note.data.systemTags.includes(tag => tag === 'markdown')
  );
};

export default noteTitleAndPreview;
