import { partition, sortBy } from 'lodash';

import normalizeLineBreak from './normalize-line-break';
import isEmailTag from '../is-email-tag';

import * as T from '../../types';
import { ExportNote } from './types';

const exportNotes = (notes: Map<T.EntityId, T.Note>) => {
  const activeNotes: ExportNote[] = [];
  const trashedNotes: ExportNote[] = [];
  [...notes.entries()].forEach((notePair) => {
    const [id, note] = notePair;
    const [collaboratorEmails, tags] = partition(
      sortBy(note.tags, (a) => a.toLocaleLowerCase()),
      isEmailTag
    );
    const parsedNote = Object.assign(
      {
        id,
        content: normalizeLineBreak(note.content),
        creationDate: new Date(note.creationDate * 1000).toISOString(),
        lastModified: new Date(note.modificationDate * 1000).toISOString(),
      },
      note.systemTags.includes('pinned') && { pinned: true },
      note.systemTags.includes('markdown') && { markdown: true },
      tags.length && { tags },
      note.systemTags.includes('published') &&
        note?.publishURL && {
          publicURL: `https://simp.ly/p/${note.publishURL}`,
        },
      note.systemTags.includes('shared') &&
        collaboratorEmails.length && { collaboratorEmails }
    );
    note.deleted ? trashedNotes.push(parsedNote) : activeNotes.push(parsedNote);
  });
  return Promise.resolve({ activeNotes, trashedNotes });
};

export default exportNotes;
