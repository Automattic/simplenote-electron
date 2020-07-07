import debugFactory from 'debug';
import { notesAreEqual } from '../../selectors';
import { tagHashOf } from '../../../utils/tag-hash';

import type * as S from '../../';
import type * as T from '../../../types';

import type { BucketQueue } from './bucket-queue';

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => DOMHighResTimeStamp;
}

export class NoteDoctor {
  firstRun: boolean;
  log: ReturnType<typeof debugFactory>;
  noteTags: Map<T.TagHash, Set<T.EntityId>>;
  notes: Set<T.EntityId>;
  queue: BucketQueue<'note', T.Note>;
  store: S.Store;

  constructor(store: S.Store, noteQueue: BucketQueue<'note', T.Note>) {
    this.firstRun = true;
    this.log = debugFactory('note-doctor');
    this.noteTags = new Map();
    this.notes = new Set();
    this.queue = noteQueue;
    this.store = store;

    this.schedule();
  }

  private schedule(): void {
    this.requestIdleCallback((idleDeadline: IdleDeadline) => {
      this.checkNotes(idleDeadline);

      if (this.notes.size > 0) {
        this.schedule();
      } else {
        setTimeout(
          () => {
            this.refreshNoteList();
            this.schedule();
          },
          this.firstRun ? 1000 : 10000
        );
      }
    });
  }

  private checkNotes(idleDeadline: IdleDeadline): void {
    this.log(`checking ${this.notes.size} notes`);
    for (const noteId of this.notes) {
      const state = this.store.getState();
      const note = state.data.notes.get(noteId);
      const ghost = state.simperium.ghosts[1].get('note')?.get(noteId)?.data;
      this.notes.delete(noteId);

      note?.tags.forEach((tagName) => {
        const tagHash = tagHashOf(tagName);
        const tag = this.noteTags.get(tagHash) ?? new Set();

        tag.add(noteId);
        this.noteTags.set(tagHash, tag);
      });

      if (!this.queue.has(noteId) && (!ghost || !notesAreEqual(note, ghost))) {
        this.log(`found note discrepancy: adding ${noteId}`);
        this.queue.add(noteId, Date.now());
      }

      if (idleDeadline.timeRemaining() <= 0) {
        this.log('pausing for idle');
        return;
      }
    }
  }

  private refreshNoteList(): void {
    // we want to walk the list in its entirety
    // before restarting so only reset if we have
    // walked through every note from the previous run
    if (this.notes.size > 0) {
      return;
    }

    !this.firstRun &&
      this.store.dispatch({
        type: 'TAG_REFRESH',
        noteTags: this.noteTags,
      });
    this.firstRun = false;

    this.notes = new Set(this.store.getState().data.notes.keys());
    this.noteTags = new Map();
  }

  private requestIdleCallback(callback: (idleDeadline: IdleDeadline) => any) {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback);
    } else {
      setTimeout(() => {
        const start = Date.now();
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
      }, 500);
    }
  }
}
