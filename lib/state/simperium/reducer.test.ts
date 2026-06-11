import simperiumReducer from './reducer';
import type * as T from '../../types';

const noteId = 'note-1' as T.EntityId;
const otherNoteId = 'note-2' as T.EntityId;

const minimalNote: T.Note = {
  content: 'Hello',
  creationDate: 0,
  deleted: false,
  modificationDate: 0,
  systemTags: [],
  tags: [],
};

const stateWithSyncError = () =>
  simperiumReducer(undefined, {
    type: 'NOTE_SYNC_ERROR',
    noteId,
    errorCode: 413,
  });

describe('simperium reducer syncErrors', () => {
  it('sets error code on NOTE_SYNC_ERROR', () => {
    const state = stateWithSyncError();

    expect(state.syncErrors.get(noteId)).toBe(413);
    expect(state.syncErrors.size).toBe(1);
  });

  it('preserves existing errors when setting a new one', () => {
    const state = simperiumReducer(stateWithSyncError(), {
      type: 'NOTE_SYNC_ERROR',
      noteId: otherNoteId,
      errorCode: 500,
    });

    expect(state.syncErrors.get(noteId)).toBe(413);
    expect(state.syncErrors.get(otherNoteId)).toBe(500);
    expect(state.syncErrors.size).toBe(2);
  });

  it.each([
    [
      'ACKNOWLEDGE_PENDING_CHANGE',
      { type: 'ACKNOWLEDGE_PENDING_CHANGE', entityId: noteId, ccid: 'ccid-1' },
    ],
    [
      'REMOTE_NOTE_UPDATE',
      { type: 'REMOTE_NOTE_UPDATE', noteId, note: minimalNote },
    ],
    [
      'REMOTE_NOTE_DELETE_FOREVER',
      { type: 'REMOTE_NOTE_DELETE_FOREVER', noteId },
    ],
    ['DELETE_NOTE_FOREVER', { type: 'DELETE_NOTE_FOREVER', noteId }],
    ['NOTE_BUCKET_REMOVE', { type: 'NOTE_BUCKET_REMOVE', noteId }],
  ] as const)('clears sync error on %s', (_label, action) => {
    const state = simperiumReducer(stateWithSyncError(), action);

    expect(state.syncErrors.has(noteId)).toBe(false);
    expect(state.syncErrors.size).toBe(0);
  });

  it.each([
    [
      'ACKNOWLEDGE_PENDING_CHANGE',
      {
        type: 'ACKNOWLEDGE_PENDING_CHANGE',
        entityId: otherNoteId,
        ccid: 'ccid-1',
      },
    ],
    [
      'REMOTE_NOTE_UPDATE',
      { type: 'REMOTE_NOTE_UPDATE', noteId: otherNoteId, note: minimalNote },
    ],
    [
      'REMOTE_NOTE_DELETE_FOREVER',
      { type: 'REMOTE_NOTE_DELETE_FOREVER', noteId: otherNoteId },
    ],
    [
      'DELETE_NOTE_FOREVER',
      { type: 'DELETE_NOTE_FOREVER', noteId: otherNoteId },
    ],
    ['NOTE_BUCKET_REMOVE', { type: 'NOTE_BUCKET_REMOVE', noteId: otherNoteId }],
  ] as const)(
    'does not change syncErrors when clearing an unknown note on %s',
    (_label, action) => {
      const previousState = stateWithSyncError();
      const state = simperiumReducer(previousState, action);

      expect(state.syncErrors).toBe(previousState.syncErrors);
      expect(state.syncErrors.get(noteId)).toBe(413);
    }
  );

  it('keeps sync error on SUBMIT_PENDING_CHANGE', () => {
    const previousState = stateWithSyncError();
    const state = simperiumReducer(previousState, {
      type: 'SUBMIT_PENDING_CHANGE',
      entityId: noteId,
      ccid: 'ccid-1',
    });

    expect(state.syncErrors).toBe(previousState.syncErrors);
    expect(state.syncErrors.get(noteId)).toBe(413);
  });

  it('sets syncRetrying on NOTE_SYNC_RETRY', () => {
    const state = simperiumReducer(stateWithSyncError(), {
      type: 'NOTE_SYNC_RETRY',
      noteId,
    });

    expect(state.syncRetrying.get(noteId)).toBe(true);
  });

  it('clears syncRetrying on NOTE_SYNC_ERROR', () => {
    const previousState = simperiumReducer(stateWithSyncError(), {
      type: 'NOTE_SYNC_RETRY',
      noteId,
    });
    const state = simperiumReducer(previousState, {
      type: 'NOTE_SYNC_ERROR',
      noteId,
      errorCode: 413,
    });

    expect(state.syncRetrying.has(noteId)).toBe(false);
    expect(state.syncErrors.get(noteId)).toBe(413);
  });

  it('passes through on unknown actions', () => {
    const previousState = stateWithSyncError();
    const state = simperiumReducer(previousState, {
      type: 'CHANGE_CONNECTION_STATUS',
      status: 'green',
    });

    expect(state.syncErrors).toBe(previousState.syncErrors);
    expect(state.syncErrors.get(noteId)).toBe(413);
  });
});
