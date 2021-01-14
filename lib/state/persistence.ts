import * as A from './action-types';
import * as S from './';
import * as T from '../types';

const DB_VERSION = 2020065;
let keepSyncing = true;

export const stopSyncing = (): void => {
  keepSyncing = false;
};

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open('simplenote_v2', DB_VERSION);

    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject();
    r.onupgradeneeded = () => {
      const db = r.result;

      if (!db.objectStoreNames.contains('state')) {
        db.createObjectStore('state');
      }

      if (!db.objectStoreNames.contains('revisions')) {
        db.createObjectStore('revisions');
      }
    };
    r.onblocked = () => reject();
  });

export const loadState = (
  accountName: string | null
): Promise<[T.RecursivePartial<S.State>, S.Middleware | null]> =>
  openDB()
    .then(
      (db): Promise<[T.RecursivePartial<S.State>, S.Middleware | null]> =>
        new Promise((resolve) => {
          let stillGood = true;

          const tx = db.transaction(['state', 'revisions'], 'readonly');

          db.onversionchange = () => {
            stillGood = false;
            resolve([{}, middleware]);
          };

          const stateRequest = tx.objectStore('state').get('state');
          stateRequest.onsuccess = () => {
            if (!stillGood) {
              resolve([{}, middleware]);
              return;
            }

            const state = stateRequest.result;
            if (!state) {
              resolve([{}, middleware]);
              return;
            }

            try {
              if (accountName !== null && state.accountName !== accountName) {
                resolve([{}, middleware]);
                return;
              }

              const noteTags = new Map(
                state.noteTags.map(([tagHash, noteIds]) => [
                  tagHash,
                  new Set(noteIds),
                ])
              );

              const data: T.RecursivePartial<S.State> = {
                data: {
                  accountVerification: state.accountVerification ?? null,
                  analyticsAllowed: state.allowAnalytics ?? null,
                  notes: new Map(state.notes),
                  noteTags,
                  tags: new Map(state.tags),
                },
                settings: {
                  accountName: state.accountName,
                },
                simperium: {
                  ghosts: [new Map(state.cvs), new Map(state.ghosts)],
                  lastRemoteUpdate: new Map(state.lastRemoteUpdate),
                  lastSync: new Map(state.lastSync),
                },
              };

              const hasPreferences = 'preferences' in state;
              if (!hasPreferences) {
                data.simperium.ghosts[0].delete('preferences');
                data.simperium.ghosts[1].delete('preferences');
              } else {
                data.data.preferences = new Map(state.preferences);
              }

              const revisionsRequest = tx.objectStore('revisions').openCursor();
              const noteRevisions = new Map<T.EntityId, Map<number, T.Note>>();
              revisionsRequest.onsuccess = () => {
                if (!stillGood) {
                  resolve([data, middleware]);
                  return;
                }

                const cursor = revisionsRequest.result;
                if (cursor) {
                  noteRevisions.set(cursor.key, new Map(cursor.value));
                  cursor.continue();
                } else {
                  resolve([
                    {
                      ...data,
                      data: {
                        ...data.data,
                        noteRevisions,
                      },
                    },
                    middleware,
                  ]);
                }
              };
              revisionsRequest.onerror = () => resolve([data, middleware]);
            } catch (e) {
              resolve([{}, middleware]);
            }
          };

          stateRequest.onerror = () => resolve([{}, middleware]);
        })
    )
    .catch(() => [{}, null]);

const persistRevisions = async (
  noteId: T.EntityId,
  revisions: [number, T.Note][]
) => {
  const tx = (await openDB()).transaction('revisions', 'readwrite');

  const readRequest = tx.objectStore('revisions').get(noteId);
  readRequest.onsuccess = () => {
    // we might have some stored revisions
    const savedRevisions = readRequest.result;

    // so merge them to store as many as we can
    const merged: [number, T.Note][] = savedRevisions?.slice() ?? [];
    const seen = new Set<number>(merged.map(([version]) => version));

    revisions.forEach(([version, note]) => {
      if (!seen.has(version)) {
        merged.push([version, note]);
        seen.add(version);
      }
    });
    merged.sort((a, b) => a[0] - b[0]);

    tx.objectStore('revisions').put(merged, noteId);
  };
  readRequest.onerror = () => {
    // it's fine if we have no saved revisions
    tx.objectStore('revisions').put(revisions, noteId);
  };
};

export const saveState = (state: S.State) => {
  const notes = Array.from(state.data.notes);
  const noteTags = Array.from(state.data.noteTags).map(([tagHash, noteIds]) => [
    tagHash,
    Array.from(noteIds),
  ]);
  const preferences = Array.from(state.data.preferences);
  const tags = Array.from(state.data.tags);
  const cvs = Array.from(state.simperium.ghosts[0]);
  const ghosts = Array.from(state.simperium.ghosts[1]);
  const lastRemoteUpdate = Array.from(state.simperium.lastRemoteUpdate);
  const lastSync = Array.from(state.simperium.lastSync);

  const data = {
    accountName: state.settings.accountName,
    accountVerification: state.data.accountVerification,
    allowAnalytics: state.data.analyticsAllowed,
    notes,
    noteTags,
    preferences,
    tags,
    cvs,
    ghosts,
    lastRemoteUpdate,
    lastSync,
  };

  return openDB().then((db) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(data, 'state');
  });
};

export const middleware: S.Middleware = ({ dispatch, getState }) => (next) => {
  let worker: ReturnType<typeof setTimeout> | null = null;

  return (action: A.ActionType) => {
    const result = next(action);

    if (worker) {
      clearTimeout(worker);
    }
    if (keepSyncing) {
      worker = setTimeout(() => keepSyncing && saveState(getState()), 1000);
    }

    if (action.type === 'LOAD_REVISIONS' && action.revisions.length > 0) {
      persistRevisions(action.noteId, action.revisions);
    }

    return result;
  };
};
