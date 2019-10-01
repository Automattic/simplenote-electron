import simperium, { Client } from 'simperium';
import store_provider from './store-provider';
import ghost_store from './ghost-store';
import localQueueStore from './local-queue-store';
import util from 'util';
import events from 'events';

export const Auth = simperium.Auth;

export default function(settings) {
  const browserClient = new BrowserClient(settings);

  window.addEventListener('beforeunload', () => {
    Object.values(browserClient.buckets).forEach(localQueueStore.persist);
  });

  return browserClient;
}

Client.Bucket.prototype.query = function(fn) {
  this.store.setup.then(fn);
};

function BrowserClient({ appID, token, bucketConfig, database, version }) {
  this.databaseName = database || 'simperium-objects';
  this.databaseVersion = version || 1;
  let config = (this.bucketConfig = bucketConfig);
  this.bucketDB = store_provider(this.configureDb.bind(this));
  this.buckets = {};

  let objectStoreProvider = this.bucketDB.provider();
  this.ghostStore = ghost_store;

  this.client = simperium(appID, token, {
    ghostStoreProvider: ghost_store,
    objectStoreProvider: function(bucket) {
      var store = objectStoreProvider.apply(null, arguments);
      if (config[bucket.name].beforeIndex) {
        store.beforeIndex = config[bucket.name].beforeIndex;
      }
      return store;
    },
  });

  [
    'send',
    'message',
    'connect',
    'reconnect',
    'disconnect',
    'unauthorized',
  ].forEach(
    function(event) {
      this.client.on(
        event,
        function() {
          let args = [].slice.call(arguments);
          this.emit.apply(this, [event].concat(args));
        }.bind(this)
      );
    }.bind(this)
  );

  for (let bucketName in bucketConfig) {
    const bucket = this.client.bucket(bucketName);
    localQueueStore.restoreTo(bucket);
    this.buckets[bucketName] = bucket;
  }
}

util.inherits(BrowserClient, events.EventEmitter);

BrowserClient.prototype.configureDb = function(resolve) {
  var openRequest = window.indexedDB.open(
    this.databaseName,
    this.databaseVersion
  );
  var upgraded = false;

  openRequest.onupgradeneeded = function(e) {
    upgraded = true;
    let db = e.target.result;

    let stores = db.objectStoreNames;
    let objectStore;

    for (let name in this.bucketConfig) {
      let setup = this.bucketConfig[name];
      if (typeof setup !== 'function') {
        setup = setup.configure;
      }
      if (stores.contains(name)) db.deleteObjectStore(name);
      objectStore = db.createObjectStore(name, { keyPath: 'id' });
      setup(objectStore);
    }
  }.bind(this);

  openRequest.onerror = function(e) {
    console.log('So failed', e); // eslint-disable-line no-console
  };

  openRequest.onsuccess = function(e) {
    // if we upgraded we want to refresh object stores with the ghost stores
    global.bucketDB = e.target.result;
    resolve(e.target.result);

    if (!upgraded) return;

    // reload buckets
    for (let name in this.buckets) {
      this.buckets[name].reload();
    }
  }.bind(this);
};

BrowserClient.prototype.isAuthorized = function() {
  return !!this.client.accessToken;
};

BrowserClient.prototype.reset = function() {
  // loop through each known bucket and generate a promise to reset the bucket
  return this.bucketDB.reset().then(
    () => {
      return ghost_store.reset();
    },
    e => {
      console.error('Failed to reset', e); // eslint-disable-line no-console
    }
  );
};

BrowserClient.prototype.bucket = function(name) {
  return this.buckets[name];
};

BrowserClient.prototype.setUser = function(user) {
  this.client.setAccessToken(user.access_token);
  this.emit('authorized');
};

BrowserClient.prototype.deauthorize = function() {
  this.client.setAccessToken(null);
  this.emit('unauthorized');
  this.client.end();
  this.reset();
};

BrowserClient.prototype.clearAuthorization = function() {
  this.client.setAccessToken(null);
  this.client.end();
};
