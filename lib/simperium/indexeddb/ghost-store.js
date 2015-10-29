/* eslint-disable no-shadow */
var Promise = require('promise');

var db = window.indexedDB,
  setup = new Promise(function(resolve, reject) {
    var open = db.open('ghost', 200);

    open.onupgradeneeded = function(e) {
      var db = e.target.result;

      var stores = db.objectStoreNames;

      if (stores.contains('cv')) db.deleteObjectStore('cv');

      let cv = db.createObjectStore('cv', { keyPath: 'bucket' });
      cv.createIndex('bucket', 'bucket', { unique: true });

      if (stores.contains('ghosts')) db.deleteObjectStore('ghosts');
      let ghosts = db.createObjectStore('ghosts', { keyPath: 'full_key' });
      ghosts.createIndex('bucket', 'bucket');
      ghosts.createIndex('full_key', 'full_key', { unique: true });
    };

    open.onsuccess = function(e) {
      var db = e.target.result;
      resolve(db);
    };

    open.onerror = function(e) {
      reject(e.target.error);
    };

			db.onerror = function(e) {
				reject(e.target.error);
			}

		}),
		boot = function() {
			return setup.catch((e) => console.error("Failed to initialize ghost storage", e));
  }

setup.catch(function(e) {
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

export function GhostStore(bucket) {
  this.bucket = bucket;
}

GhostStore.prototype.getChangeVersion = function() {
  var bucket = this.bucket;
  return new Promise(function(resolve) {
    setup.then(function(db) {
      var tx = db
        .transaction('cv')
        .objectStore('cv')
        .get(bucket.name);
      tx.onsuccess = function(e) {
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

GhostStore.prototype.setChangeVersion = function(cv) {
  var bucket = this.bucket;

  return new Promise(function(resolve) {
    setup.then(function(db) {
      var tx = db
        .transaction('cv', 'readwrite')
        .objectStore('cv')
        .put({ bucket: bucket.name, cv: cv });
      tx.onsuccess = resolve;
    });
  });
};

GhostStore.prototype.put = function(id, version, data) {
  var bucket = this.bucket,
    promise = new Promise(function(resolve) {
      setup.then(function(db) {
        var tx = db.transaction(['ghosts'], 'readwrite'),
          ghosts = tx.objectStore('ghosts'),
          full_key = bucket.name + '.' + id,
          ghost = {
            key: id,
            version: version,
            data: data,
            full_key: full_key,
            bucket: bucket.name,
          };

        ghosts.put(ghost).onsuccess = function(e) {
          resolve(e.target.result);
        };
      });
    });
  return promise;
};

GhostStore.prototype.get = function(id) {
  var bucket = this.bucket,
    promise = new Promise(function(resolve, reject) {
      setup.then(function(db) {
        var ghosts = db.transaction('ghosts').objectStore('ghosts');
        var key = bucket.name + '.' + id;

        var request = ghosts.get(key);
        request.onsuccess = function(e) {
          var ghost = e.target.result;
          if (!ghost) {
            ghost = { key: id, data: {} };
          }
          resolve(ghost);
        };
        request.onerror = function(e) {
          var error = new Error('failed to get ghost ' + key);
          error.objectStoreEvent = e;
          reject(error);
        };
      });
    });

  return promise;
};

GhostStore.prototype.remove = function(id) {
  var bucket = this.bucket,
    promise = new Promise(function(resolve, reject) {
      setup.then(function(db) {
        var ghosts = db
          .transaction('ghosts', 'readwrite')
          .objectStore('ghosts');
        var key = bucket.name + '.' + id;
        var request = ghosts.delete(key);

        request.onsuccess = function() {
          resolve();
        };

        request.onerror = function() {
          reject(new Error('Failed to delete ghost ' + key));
        };
      });
    });

  return promise;
};

GhostStore.prototype.eachGhost = function(onGhost) {
  var bucket = this.bucket;

  setup.then(
    function(db) {
      var request = db
        .transaction('ghosts')
        .objectStore('ghosts')
        .index('bucket')
        .openCursor(IDBKeyRange.only(bucket.name));
      request.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          onGhost(cursor.value);
          cursor.continue();
        }
      };
    },
    function() {
      console.log('Failed!'); // eslint-disable-line no-console
    }
  );
};

export default function(bucket) {
	boot();
  return new GhostStore(bucket);
}

export function reset () {

  return setup.then(db => {
    return Promise.all(
      [].map.call(db.objectStoreNames, name => {
        return new Promise((resolve, reject) => {
          var request = db
            .transaction(name, 'readwrite')
            .objectStore(name)
            .clear();
          request.onsuccess = () => {
            resolve(name);
          };
          request.onerror = e => {
            reject(e);
          };
        });
      })
    );
  });
};
