import { NoteDoctor } from './note-doctor';
import type { BucketQueue } from './bucket-queue';
import type * as S from '../../';
import type * as T from '../../../types';

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

describe('NoteDoctor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.requestIdleCallback = (callback) => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50,
      });
      return 1;
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const runStartupScan = () => {
    jest.advanceTimersByTime(1000);
    jest.runOnlyPendingTimers();
  };

  it('queues unsynced notes for sync on startup', () => {
    const queue = {
      has: jest.fn().mockReturnValue(false),
      add: jest.fn(),
    } as unknown as BucketQueue<'note', T.Note>;

    const store = {
      getState: () =>
        ({
          data: {
            notes: new Map([[noteId, localNote]]),
          },
          simperium: {
            ghosts: [
              new Map(),
              new Map([['note', new Map([[noteId, { data: ghostNote }]])]]),
            ],
          },
        }) as unknown as S.State,
      dispatch: jest.fn(),
    } as unknown as S.Store;

    new NoteDoctor(store, queue);

    runStartupScan();

    expect(queue.add).toHaveBeenCalledWith(noteId, expect.any(Number));
  });

  it('does not queue notes that already match their ghost', () => {
    const queue = {
      has: jest.fn().mockReturnValue(false),
      add: jest.fn(),
    } as unknown as BucketQueue<'note', T.Note>;

    const store = {
      getState: () =>
        ({
          data: {
            notes: new Map([[noteId, localNote]]),
          },
          simperium: {
            ghosts: [
              new Map(),
              new Map([['note', new Map([[noteId, { data: localNote }]])]]),
            ],
          },
        }) as unknown as S.State,
      dispatch: jest.fn(),
    } as unknown as S.Store;

    new NoteDoctor(store, queue);

    runStartupScan();

    expect(queue.add).not.toHaveBeenCalled();
  });
});
