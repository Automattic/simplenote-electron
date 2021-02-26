import sanitize from 'sanitize-filename';
import { identity } from 'lodash';

import { LF_ONLY_NEWLINES } from './export-notes';

const FILENAME_LENGTH = 40;
const TAG_LINE_LENGTH = 75;

/**
 * Generates filename for note based on note content
 *
 * Please see code for algorithm. The goal is to
 * find the first usable and non-blank line of text
 * from the note to generate the title.
 *
 * @param {Object} note object
 * @returns {Object} augmented note object with new filename
 */
const addFilename = (note) => ({
  ...note,
  fileName: note.content
    .split('\n') // base filename off of a single line
    .map((line) => line.trim()) // and ignore leading/trailing spaces
    .map(sanitize) // strip away any invalid characters for a filename (such as `/`)
    .filter(identity) // remove blank lines
    .concat('untitled') // use this as a default if there are no non-blank lines
    .shift() // take the first remaining line
    .slice(0, FILENAME_LENGTH), // and truncate to some reasonable number of characters
});

/**
 * Appends associated tags as a list at end of note content if available
 *
 * This lines up the tags in an indented block separated by commas.
 * It does not attempt to control widows and orphans on the tag lines
 * which could be an eyesore for notes with enough tags.
 *
 * @example
 * // returns the following
 * """
 * a regular plumbus
 *
 * Tags:
 *   plumbus, howisitmade
 * """
 * appendTags( { content: 'a regular plumbus', tags: [ 'plumbus', 'howisitmade' ] } )
 *
 * @example
 * // returns note content unchanged
 * appendTags( { content: 'the fleeb has the fleeb juice' } )
 *
 * @param {Object} note note object
 * @returns {Object} augmented note whose
 */
const appendTags = (note) => {
  if (!note.tags) {
    return note;
  }

  const tagLines = note.tags
    .reduce(
      ([lines, lastLine], tag) =>
        lastLine.length + tag.length > TAG_LINE_LENGTH // is line full (width)?
          ? [[...lines, lastLine], tag] // if so, then start a new line
          : [lines, `${lastLine}, ${tag}`], // else continue the previous line
      [[], '']
    )
    .reduce((a, b) => [...a, b]) // join trailing line from reduction
    .map((line) => line.replace(/^, /, '')); // remove leading commas

  return {
    ...note,
    content: `${note.content}\n\nTags:\n  ${tagLines.join('\n  ')}`,
  };
};

/**
 * Maps over notes and replaces duplicate filenames with ones appended by an increasing number
 *
 * @example
 * // when given `Yummy Recipe` and `Yummy Recipe` as duplicates
 * // will return `Yummy Recipe` and `Yummy Recipe (1)`
 *
 * @param {[Array, Map]} accumulator list of note objects for export and filename counts
 * @param {Object} note note object
 * @returns {[Array, Object]} final note list and accumulating filename counts
 */
const toUniqueNames = ([notes, nameCounts], note) => {
  nameCounts.set(note.fileName, (nameCounts.get(note.fileName) ?? -1) + 1);
  const count = nameCounts.get(note.fileName);

  const fileName = count > 0 ? `${note.fileName} (${count})` : note.fileName;

  return [[...notes, { ...note, fileName }], nameCounts];
};

export const noteExportToZip = (notes) => {
  return import(/* webpackChunkName: 'jszip' */ 'jszip')
    .then(({ default: JSZip }) => {
      const zip = new JSZip();

      zip.file(
        'source/notes.json',
        JSON.stringify(notes, null, 2).replace(LF_ONLY_NEWLINES, '\r\n')
      );

      notes.activeNotes
        .map(appendTags) // add tags to end of content
        .map(addFilename) // generate filename from content
        .reduce(toUniqueNames, [[], new Map()]) // add `(n)` if there are duplicates
        .shift() // the list of notes is the first item in the pair returned from above
        .forEach(({ content, fileName, lastModified }) => {
          zip.file(`${fileName}.txt`, content, {
            date: new Date(lastModified),
          });
        }); // add the note as a file in the zip

      notes.trashedNotes
        .map(appendTags) // add tags to end of content
        .map(addFilename) // generate filename from content
        .reduce(toUniqueNames, [[], new Map()]) // add `(n)` if there are duplicates
        .shift() // the list of notes is the first item in the pair returned from above
        .forEach(({ content, fileName, lastModified }) => {
          zip.file(`trash/${fileName}.txt`, content, {
            date: new Date(lastModified),
          });
        }); // add the note as a file in the zip

      return zip;
    })
    .catch(console.log); // eslint-disable-line no-console
};

export default noteExportToZip;
