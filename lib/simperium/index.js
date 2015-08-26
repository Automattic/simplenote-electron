var simperium    = require('simperium'),
    bucket_store = require('./bucket_store'),
    ghost_store  = require('./ghost_store'),
    util         = require('util'),
    events       = require('events');

module.exports = function(appID, token, bucketConfig, database, version) {
  return new BrowserClient(appID, token, bucketConfig, database, version);
};

simperium.Client.Bucket.prototype.query = function(fn) {
  this.store.setup.then(fn);
};

function BrowserClient(appID, token, bucketConfig, database, version) {
  this.databaseName = database || "simperium-objects";
  this.databaseVersion = version || 1;
  this.bucketConfig = bucketConfig;
  this.bucketDB = bucket_store(this.configureDb.bind(this));
  this.buckets = {};

  this.client = simperium(appID, token, {
    ghostStoreProvider: ghost_store,
    objectStoreProvider: this.bucketDB.provider()
  });

  ['send', 'message'].forEach((function(event) {
    this.client.on(event, (function() {
      var args = [].slice.call(arguments);
      this.emit.apply(this, [event].concat(args));
    }).bind(this));
  }).bind(this));

  for (var bucket in bucketConfig) {
    this.buckets[bucket] = this.client.bucket(bucket);
  }

}

util.inherits(BrowserClient, events.EventEmitter);

BrowserClient.prototype.configureDb = function(resolve, reject) {

  var openRequest = window.indexedDB.open(this.databaseName, this.databaseVersion);
  var upgraded = false;
  var buckets = this.buckets;

  openRequest.onupgradeneeded = (function(e) {
    upgraded = true;
    var db = e.target.result;

    var stores = db.objectStoreNames;
    var objectStore;

    for (var name in this.bucketConfig) {
      var setup = this.bucketConfig[name];
      if (stores.contains(name))  db.deleteObjectStore(name);
      objectStore = db.createObjectStore(name, { keyPath: 'id' });
      setup(objectStore);
    }

  }).bind(this);

  openRequest.onerror = function(e) {
    console.log("So failed", e);
  };

  openRequest.onsuccess = (function(e) {
    // if we upgraded we want to refresh object stores with the ghost stores
    global.bucketDB = e.target.result;
    resolve(e.target.result);

    if (!upgraded) return;

    // reload buckets
    for (var name in this.buckets) {
      this.buckets[name].reload();
    }

  }).bind(this);

};

BrowserClient.prototype.bucket = function(name) {
  return this.buckets[name];
};