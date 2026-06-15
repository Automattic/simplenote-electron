import type { Ghost } from 'simperium';

import { noteHasPendingChanges } from './selectors';
import type * as S from './';
import type * as T from '../types';

const noteId = 'note-1' as T.EntityId;

const localNote: T.Note = {
  content: 'local content',
  creationDate: 0,
  deleted: false,
  modificationDate: 1,
  systemTags: [],
  tags: [],
};

const ghostNote: T.Note = {
  ...localNote,
  content: 'server content',
};

const makeState = (
  overrides: {
    note?: T.Note;
    ghost?: T.Note;
  } = {}
): S.State => {
  const note = overrides.note ?? localNote;
  const ghost = overrides.ghost ?? ghostNote;
  const noteGhosts = new Map<T.EntityId, Ghost<T.Note>>();

  if (ghost) {
    noteGhosts.set(noteId, { data: ghost } as Ghost<T.Note>);
  }

  return {
    data: {
      notes: new Map([[noteId, note]]),
    },
    simperium: {
      ghosts: [new Map(), new Map([['note', noteGhosts]])],
    },
  } as unknown as S.State;
};

describe('noteHasPendingChanges', () => {
  it('returns false when local and ghost notes match', () => {
    const state = makeState({ ghost: localNote });

    expect(noteHasPendingChanges(state, noteId)).toBe(false);
  });

  it('returns true when local and ghost notes differ', () => {
    const state = makeState();

    expect(noteHasPendingChanges(state, noteId)).toBe(true);
  });
});
