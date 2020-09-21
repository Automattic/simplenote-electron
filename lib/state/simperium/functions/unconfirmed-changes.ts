import { notesAreEqual } from '../../selectors';

import type * as S from '../../';
import type { EntityId } from 'simperium';

const getUnconfirmedNotes = (state: S.State): EntityId[] => {
  const notes: EntityId[] = [];

  state.data.notes.forEach((note, noteId) => {
    const ghost = state.simperium.ghosts[1].get('note')?.get(noteId);

    if (!ghost || !notesAreEqual(note, ghost.data)) {
      notes.push(noteId);
    }
  });

  return notes;
};

const getUnconfirmedPreferences = (state: S.State): EntityId[] => {
  return [];
};

const getUnconfirmedTags = (state: S.State): EntityId[] => {
  return [];
};

export const getUnconfirmedChanges = (
  state: S.State
): Record<'notes' | 'preferences' | 'tags', EntityId[]> => {
  return {
    notes: getUnconfirmedNotes(state),
    preferences: getUnconfirmedPreferences(state),
    tags: getUnconfirmedTags(state),
  };
};
