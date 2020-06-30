import debugFactory from 'debug';
import { notesAreEqual } from '../../selectors';

import * as S from '../../';
import * as T from '../../../types';

import type { EntityId } from 'simperium';
import type { BucketQueue } from './bucket-queue';

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => DOMHighResTimeStamp;
}

export class NoteDoctor {
  log: ReturnType<typeof debugFactory>;
  notes: Set<EntityId>;
  queue: BucketQueue<'note', T.Note>;
  store: S.Store;

  constructor(store: S.Store, noteQueue: BucketQueue<'note', T.Note>) {
    this.log = debugFactory('note-doctor');
    this.notes = new Set();
    this.queue = noteQueue;
    this.store = store;

    setTimeout(() => {
      this.refreshNoteList();
      this.schedule();
    }, 1000);
  }

  private schedule(): void {
    this.requestIdleCallback((idleDeadline: IdleDeadline) => {
      this.checkNotes(idleDeadline);

      if (this.notes.size > 0) {
        this.schedule();
      } else {
        setTimeout(() => {
          this.refreshNoteList();
          this.schedule();
        }, 10000);
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

    this.notes = new Set(this.store.getState().data.notes.keys());
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
