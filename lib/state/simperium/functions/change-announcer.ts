import actions from '../../actions';

import type { EntityId } from 'simperium';
import * as S from '../../';
import * as T from '../../../types';

// @TODO: Remove once @types/simperium has updated with the right bucket.channel.on('update')
type DMPDiff = string;
type DiffOp<T> =
  | { o: '+'; v: T }
  | { o: '-' }
  | { o: 'r'; v: T }
  | { o: 'I'; v: number }
  | {
      o: 'L';
      v: { [index: number]: T extends Array<infer U> ? DiffOp<U> : never };
    }
  | { o: 'O'; v: JSONDiff<T> }
  | { o: 'd'; v: DMPDiff };

type JSONDiff<T> = { [K in keyof T]?: DiffOp<T[K]> };

// @TODO: No support in IE - don't load…
export const announceNoteUpdates = ({ dispatch, getState }: S.Store) => {
  const noteIfy = (noteId: EntityId, title: string, body: string) =>
    (new Notification(title, { body, tag: noteId }).onclick = () =>
      dispatch(actions.ui.openNote(noteId)));

  return (
    noteId: EntityId,
    note: T.Note,
    original?: T.Note,
    patch?: JSONDiff<T.Note>,
    isIndexing?: boolean
  ) => {
    if (!getState().settings.sendNotifications) {
      return;
    }

    if (isIndexing || !patch) {
      return;
    }

    if (Object.getOwnPropertyNames(original).length === 0) {
      noteIfy(noteId, 'New Note', note.content.slice(0, 200) || '(no content)');
      return;
    }

    if (patch.deleted?.o === 'r') {
      noteIfy(
        noteId,
        patch.deleted.v ? 'Note Trashed' : 'Note Restored',
        note.content.slice(0, 200) || '(no content)'
      );
      return;
    }

    if (!original?.publishURL && note.publishURL?.length) {
      noteIfy(
        noteId,
        'Note Published',
        note.content.slice(0, 200) || '(no content)'
      );
      return;
    }

    if (
      original?.systemTags?.includes('published') &&
      !note.systemTags.includes('published')
    ) {
      noteIfy(
        noteId,
        'Note Unpublished',
        note.content.slice(0, 200) || '(no content)'
      );
      return;
    }

    if (patch.tags && !patch.content) {
      const oldTags = new Set<string>(original?.tags || []);
      const newTags = new Set<string>(note.tags);
      const removed = [...oldTags.values()].filter((tag) => !newTags.has(tag));
      const added = [...newTags.values()].filter((tag) => !oldTags.has(tag));

      // @TODO: Handle ugly cases for string truncation
      noteIfy(
        noteId,
        `Tags modified: ${note.content.slice(0, 20) || '(untitled)'}`,
        [
          added.length > 0 && `Added: ${added.join(', ').slice(0, 20)}`,
          removed.length > 0 && `Removed: ${removed.join(', ').slice(0, 20)}`,
        ]
          .filter(Boolean)
          .join('\n')
      );
      return;
    }

    // other publish events are covered by the earlier checks
    if (
      Object.getOwnPropertyNames(patch).length === 1 &&
      ((patch.systemTags &&
        original?.systemTags.includes('published') !==
          note.systemTags.includes('published')) ||
        patch.publishURL)
    ) {
      return;
    }

    // ignore pinned and markdown and other system tag changes
    if (Object.getOwnPropertyNames(patch).length === 1 && patch.systemTags) {
      return;
    }

    noteIfy(
      noteId,
      'Note Updated',
      note.content.slice(0, 200) || '(no content)'
    );
  };
};
