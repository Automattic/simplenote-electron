/**
 * Ensure that all version 0 notes are sent to the server.
 *
 * Version 0 notes (new notes, usually created offline, that have not yet been
 * acknowledged by the server) could get stuck in that state, probably due to the
 * fact that the local queues were not persisted. If the app was quit
 * while offline, those offline changes could be lost and never sent to the
 * server unless another change is made to that note while online.
 * See https://github.com/Automattic/simplenote-electron/pull/1098
 *
 * While the persistence issue is now fixed, it doesn't address the notes that
 * have already been caught in version 0 limbo. This function finds those notes
 * and explicitly re-pushes them to the note bucket.
 */
import Debug from 'debug';

const debug = Debug('sync:nudgeUnsynced');

const nudgeUnsynced = ({ noteBucket, notes, client }) => {
  if (!client.isAuthorized()) {
    return Promise.resolve(); // not an error, just resolve and move on
  }

  return noteBucket.hasLocalChanges().then(hasChanges => {
    if (hasChanges) {
      return Promise.resolve(); // let the local queue be processed first
    }
    return updateUnsyncedNotes({ noteBucket, notes });
  });
};

function updateUnsyncedNotes({ noteBucket, notes }) {
  if (!notes) {
    return;
  }

  const noteHasSynced = note =>
    new Promise(resolve =>
      noteBucket.getVersion(note.id, (e, v) => {
        const result = {
          id: note.id,
          data: note.data,
          unsynced: e || v === 0,
        };
        resolve(result);
      })
    );

  return Promise.all(notes.map(noteHasSynced)).then(result => {
    const unsyncedNotes = result.filter(note => note.unsynced);

    debug(`${unsyncedNotes.length} unsynced notes`);
    unsyncedNotes.forEach(note => noteBucket.update(note.id, note.data));
  });
}

export default nudgeUnsynced;
