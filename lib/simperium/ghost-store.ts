import debugFactory from 'debug';
import * as T from '../types';

const debug = debugFactory('ghost-store');

const db = window.indexedDB;

const setup = new Promise((resolve, reject) => {
  const open = db.open('ghost', 200);

  open.onupgradeneeded = ({ target: { result: db } }) => {
    const stores = db.objectStoreNames;

    if (stores.contains('cv')) {
      db.deleteObjectStore('cv');
    }

    const cv = db.createObjectStore('cv', { keyPath: 'bucket' });
    cv.createIndex('bucket', 'bucket', { unique: true });

    if (stores.contains('ghosts')) {
      db.deleteObjectStore('ghosts');
    }

    const ghosts = db.createObjectStore('ghosts', { keyPath: 'full_key' });
    ghosts.createIndex('bucket', 'bucket');
    ghosts.createIndex('full_key', 'full_key', { unique: true });
  };

  open.onsuccess = ({ target: { result } }) => resolve(result);
  open.onerror = ({ target: { error } }) => reject(error);
});

setup.then(function () {
  // noop, setup as soon as possible
});

setup.catch(function (e) {
  var oldApp = window.confirm(`
  Simplenote is unable to retrieve your notes.

  This can happen if you are using a private browsing mode or you have history turned off.

  Would you like to try again using a limited version of the app?
  `);
  if (oldApp) {
    window.location = 'https://app.simplenote.com/old';
  }
  console.error(e); // eslint-disable-line no-console
});

db.onerror = function (e) {
  console.log('Some kind of error', e); // eslint-disable-line no-console
};

export function GhostStore(bucket) {
  this.bucket = bucket;
}

GhostStore.prototype.getChangeVersion = function () {
  var bucket = this.bucket;
  return new Promise(function (resolve) {
    setup.then(function (db) {
      var tx = db.transaction('cv').objectStore('cv').get(bucket.name);
      tx.onsuccess = function (e) {
        var record = e.target.result,
          cv = null;
        if (record) {
          cv = record.cv;
        }
        resolve(cv);
      };
    });
  });
};

GhostStore.prototype.setChangeVersion = function (cv) {
  var bucket = this.bucket;

  return new Promise(function (resolve) {
    setup.then(function (db) {
      var tx = db
        .transaction('cv', 'readwrite')
        .objectStore('cv')
        .put({ bucket: bucket.name, cv: cv });
      tx.onsuccess = resolve;
    });
  });
};

GhostStore.prototype.put = function (
  id: T.EntityId,
  version: number,
  data: unknown
) {
  return new Promise((resolve) =>
    setup.then((db: IDBRequest) => {
      const transaction = db.transaction(['ghosts'], 'readwrite');
      const ghostStore = transaction.objectStore('ghosts');
      const fullKey = `${this.bucket.name}.${id}`;

      ghostStore.get(fullKey).onsuccess = ({
        target: { result: oldGhost },
      }) => {
        const ghost = oldGhost || { key: id, data: {} };

        if (version <= ghost.version) {
          // we already have this ghost
          // don't downgrade
          debug(
            `Refusing to update ghost for ${id}: ${version} is not greater than ${ghost.version}`
          );
          resolve(ghost);
          return;
        }

        ghostStore.put({
          key: id,
          version,
          data,
          full_key: fullKey,
          bucket: this.bucket.name,
        }).onsuccess = ({ target: { result: newGhost } }) => {
          resolve(newGhost);
        };
      };
    })
  );
};

GhostStore.prototype.get = function (id) {
  var bucket = this.bucket,
    promise = new Promise(function (resolve, reject) {
      setup.then(function (db) {
        var ghosts = db.transaction('ghosts').objectStore('ghosts');
        var key = bucket.name + '.' + id;

        var request = ghosts.get(key);
        request.onsuccess = function (e) {
          var ghost = e.target.result;
          if (!ghost) {
            ghost = { key: id, data: {} };
          }
          resolve(ghost);
        };
        request.onerror = function (e) {
          var error = new Error('failed to get ghost ' + key);
          error.objectStoreEvent = e;
          reject(error);
        };
      });
    });

  return promise;
};

GhostStore.prototype.remove = function (id) {
  var bucket = this.bucket,
    promise = new Promise(function (resolve, reject) {
      setup.then(function (db) {
        var ghosts = db
          .transaction('ghosts', 'readwrite')
          .objectStore('ghosts');
        var key = bucket.name + '.' + id;
        var request = ghosts.delete(key);

        request.onsuccess = function () {
          resolve();
        };

        request.onerror = function () {
          reject(new Error('Failed to delete ghost ' + key));
        };
      });
    });

  return promise;
};

export default (bucket) => new GhostStore(bucket);

export const reset = function () {
  return setup.then((db) => {
    return Promise.all(
      [].map.call(db.objectStoreNames, (name) => {
        return new Promise((resolve, reject) => {
          var request = db
            .transaction(name, 'readwrite')
            .objectStore(name)
            .clear();
          request.onsuccess = () => {
            resolve(name);
          };
          request.onerror = (e) => {
            reject(e);
          };
        });
      })
    );
  });
};
