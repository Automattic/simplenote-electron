import simperium, { Client } from 'simperium'
import indexeddb from './indexeddb'
import websql from './websql'
import memorydb from './memorydb'
import util from 'util'
import events from 'events'
import Promise from 'promise'

export const Auth = simperium.Auth

export default function(appID, token, bucketConfig, database, version) {
	return new BrowserClient(appID, token, bucketConfig, database, version);
};

export function BrowserClient(appID, token, bucketConfig, database, version) {
	this.databaseName = database || "simperium-objects";
	this.databaseVersion = version || 1;
	this.buckets = {};

	if (window.indexedDB) {
		this.store = indexeddb(database, version, bucketConfig);
	} else if (window.openDatabase) {
		this.store = websql(database, version, bucketConfig);
	} else {
		this.store = memorydb(database, version, bucketConfig);
	}

	this.client = simperium(appID, token, this.store);

	['send', 'message', 'connect', 'reconnect', 'disconnect', 'unauthorized'].forEach((function(event) {
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

BrowserClient.prototype.isAuthorized = function() {
	return !!this.client.accessToken;
}

BrowserClient.prototype.reset = function() {
	// loop through each known bucket and generate a promise to reset the bucket
	return this.store.reset();
};

BrowserClient.prototype.bucket = function(name) {
	return this.buckets[name];
};

BrowserClient.prototype.setUser = function(user) {
	// todo, set the user access token and have the buckets reconnect
	this.client.setAccessToken(user.access_token);
	this.emit('authorized');
};

BrowserClient.prototype.deauthorize = function() {
	this.client.setAccessToken(null);
	this.emit('unauthorized');
	this.client.disconnect();
	this.reset();
}