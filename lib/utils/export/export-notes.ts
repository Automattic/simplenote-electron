import { partition, sortBy } from 'lodash';

import isEmailTag from '../is-email-tag';

import * as T from '../../types';
import { ExportNote } from './types';

export const LF_ONLY_NEWLINES = /(?!\r)\n/g;

const exportNotes = (notes: T.Note[]) => {
  const activeNotes: ExportNote[] = [];
  const trashedNotes: ExportNote[] = [];

  notes.forEach((note, id) => {
    const [collaboratorEmails, tags] = partition(
      sortBy(note.tags, (a) => a.toLocaleLowerCase()),
      isEmailTag
    );
    const parsedNote = Object.assign(
      {
        id,
        content: note.content.replace(LF_ONLY_NEWLINES, '\r\n'),
        creationDate: new Date(note.creationDate * 1000).toISOString(),
        lastModified: new Date(note.modificationDate * 1000).toISOString(),
      },
      note.systemTags.includes('pinned') && { pinned: true },
      note.systemTags.includes('markdown') && { markdown: true },
      tags.length && { tags },
      note.systemTags.includes('published') &&
        note?.publishURL && {
          publicURL: `http://simp.ly/p/${note.publishURL}`,
        },
      note.systemTags.includes('shared') &&
        collaboratorEmails.length && { collaboratorEmails }
    );
    note.deleted ? trashedNotes.push(parsedNote) : activeNotes.push(parsedNote);
  });
  return Promise.resolve({ activeNotes, trashedNotes });
};

export default exportNotes;
