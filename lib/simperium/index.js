import simperium, { Client } from 'simperium';
import indexeddb from './indexeddb';
import websql from './websql';
import memorydb from './memorydb';
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

export function BrowserClient(appID, token, bucketConfig, database, version) {
	this.databaseName = database || 'simperium-objects';
  this.databaseVersion = version || 1;
  this.buckets = {};

	if (window.indexedDB) {
		this.store = indexeddb(database, version, bucketConfig);
	} else {
		this.store = memorydb(database, version, bucketConfig);
	}

	this.client = simperium(appID, token, this.store);

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

BrowserClient.prototype.isAuthorized = function() {
  return !!this.client.accessToken;
};

BrowserClient.prototype.reset = function() {
  // loop through each known bucket and generate a promise to reset the bucket
	return this.store.reset();
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
