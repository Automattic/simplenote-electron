/**
 * Ensure that all imported notes are sent to the server
 *
 * Importing over 350-400 notes at once can cause the syncing to get
 * stuck. This function checks if there are any local notes which have not
 * been acknowledged by the server yet, and if so, reconnects the client
 * to resume the syncing.
 */
import Debug from 'debug';

const debug = Debug('sync:nudgeUnsynced');

const nudgeUnsynced = ({ noteBucket, notes, client }) => {
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

  Promise.all(notes.map(noteHasSynced)).then(result => {
    const unsyncedNotes = result.filter(note => note.unsynced);
    debug(`${unsyncedNotes.length} unsynced notes`);

    // Re-init the client and prod the syncing to resume
    if (unsyncedNotes.length) {
      client.client.connect();
    }
  });
};

export default nudgeUnsynced;
