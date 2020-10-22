import { number } from 'prop-types';
import type * as S from '../state';
import type * as T from '../types';

import getNoteTitleAndPreview from './note-utils';

const getNoteLink = (id: T.EntityId): string => `simplenote://note/${id}`;

export const getNoteReferences = (state: S.State): T.EntityId[] => {
  const matches = new Set<T.EntityId>();
  if (!state.ui.openedNote) {
    return [];
  }
  const noteLink = getNoteLink(state.ui.openedNote);
  state.data.notes.forEach((note, key) => {
    if (note.content.includes(noteLink)) {
      matches.add(key);
    }
  });
  return [...matches.values()];
};

type noteReference =
  | {
      count: number;
      noteId: T.EntityId;
      modificationDate: T.SecondsEpoch;
      title: string;
    }
  | undefined;

export const getNoteReference = (
  state: S.State,
  noteId: T.EntityId
): noteReference => {
  const note = state.data.notes.get(noteId);
  if (!note || !state.ui.openedNote) {
    return;
  }
  const regExp = new RegExp(getNoteLink(state.ui.openedNote), 'gi');
  const count = note?.content.match(regExp)?.length || 0;
  const { title } = getNoteTitleAndPreview(note);
  return {
    count,
    noteId,
    modificationDate: note?.modificationDate,
    title,
  };
};
