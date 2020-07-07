import * as A from './action-types';
import * as S from './';
import * as T from '../types';

const DB_VERSION = 2020065;

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open('simplenote', DB_VERSION);

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
  });

export const loadState = async (): Promise<
  [T.RecursivePartial<S.State>, S.Middleware | null]
> => {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch (e) {
    return [{}, null];
  }

  return new Promise((resolve) => {
    const tx = db.transaction(['state', 'revisions'], 'readonly');

    const stateRequest = tx.objectStore('state').get('state');
    stateRequest.onsuccess = () => {
      const state = stateRequest.result;

      try {
        const noteTags = new Map(
          state.noteTags.map(([tagHash, noteIds]) => [
            tagHash,
            new Set(noteIds),
          ])
        );

        const data: T.RecursivePartial<S.State> = {
          data: {
            notes: new Map(state.notes),
            noteTags,
            tags: new Map(state.tags),
          },
          simperium: {
            ghosts: [new Map(state.cvs), new Map(state.ghosts)],
            lastRemoteUpdate: new Map(state.lastRemoteUpdate),
            lastSync: new Map(state.lastSync),
          },
          ui: {
            editorSelection: new Map(state.editorSelection),
          },
        };

        const revisionsRequest = tx.objectStore('revisions').openCursor();
        const noteRevisions = new Map<T.EntityId, Map<number, T.Note>>();
        revisionsRequest.onsuccess = () => {
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
  });
};

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

export const saveState = async (state: S.State) => {
  const editorSelection = Array.from(state.ui.editorSelection);
  const notes = Array.from(state.data.notes);
  const noteTags = Array.from(state.data.noteTags).map(([tagHash, noteIds]) => [
    tagHash,
    Array.from(noteIds),
  ]);
  const tags = Array.from(state.data.tags);
  const cvs = Array.from(state.simperium.ghosts[0]);
  const ghosts = Array.from(state.simperium.ghosts[1]);
  const lastRemoteUpdate = Array.from(state.simperium.lastRemoteUpdate);
  const lastSync = Array.from(state.simperium.lastRemoteUpdate);

  const data = {
    editorSelection,
    notes,
    noteTags,
    tags,
    cvs,
    ghosts,
    lastRemoteUpdate,
    lastSync,
  };

  const tx = (await openDB()).transaction('state', 'readwrite');
  const objectStore = tx.objectStore('state');

  objectStore.put(data, 'state');
};

export const middleware: S.Middleware = ({ dispatch, getState }) => (next) => {
  let worker: ReturnType<typeof setTimeout> | null = null;

  return (action: A.ActionType) => {
    const result = next(action);

    if (worker) {
      clearTimeout(worker);
    }
    worker = setTimeout(() => saveState(getState()), 100);

    if (action.type === 'LOAD_REVISIONS' && action.revisions.length > 0) {
      persistRevisions(action.noteId, action.revisions);
    }

    return result;
  };
};
