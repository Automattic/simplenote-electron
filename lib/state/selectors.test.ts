import type { Ghost } from 'simperium';

import { noteHasPendingChanges, noteShowSyncSpinner } from './selectors';
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
    syncErrors?: Map<T.EntityId, number>;
    syncRetrying?: Map<T.EntityId, true>;
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
      syncErrors: overrides.syncErrors ?? new Map(),
      syncRetrying: overrides.syncRetrying ?? new Map(),
    },
  } as unknown as S.State;
};

describe('noteShowSyncSpinner', () => {
  it('returns false when local and ghost notes match', () => {
    const state = makeState({ ghost: localNote });

    expect(noteHasPendingChanges(state, noteId)).toBe(false);
    expect(noteShowSyncSpinner(state, noteId)).toBe(false);
  });

  it('returns true for unsynced notes without a sync error', () => {
    const state = makeState();

    expect(noteHasPendingChanges(state, noteId)).toBe(true);
    expect(noteShowSyncSpinner(state, noteId)).toBe(true);
  });

  it('returns false after a sync error until the user retries', () => {
    const state = makeState({
      syncErrors: new Map([[noteId, 413]]),
    });

    expect(noteHasPendingChanges(state, noteId)).toBe(true);
    expect(noteShowSyncSpinner(state, noteId)).toBe(false);
  });

  it('returns true during a retry after a sync error', () => {
    const state = makeState({
      syncErrors: new Map([[noteId, 413]]),
      syncRetrying: new Map([[noteId, true]]),
    });

    expect(noteShowSyncSpinner(state, noteId)).toBe(true);
  });
});
