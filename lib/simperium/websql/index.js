import { Client } from 'simperium'
import Promise from 'promise'
import { exec, transaction, DBPromise as P } from './util'
import GhostStore, { setup as setupGhostStore, reset as resetGhostStore } from './ghost-store'
import BucketStore, { setup as setupObjectStore, reset as resetObjectStore } from './bucket-store'

export default function configure(database, version, config) {

	Client.Bucket.prototype.query = function(fn) {
		return this.store.query(fn);
	};

	var setup = setupObjectStore(database, version, config)
			.catch((e) => console.error("Failed to setup", e))

	var ghostSetup = setupGhostStore()
		.catch((e) => console.error("Failed to setup ghosts", e));

	return {
		ghostStoreProvider: function(bucket) {
			return new GhostStore(ghostSetup, bucket);
		},
		objectStoreProvider: function(bucket) {
			return new BucketStore(setup, bucket, config[bucket.name]);
		},
		reset: function() {
			setup.then(resetObjectStore);
			ghostSetup.then(resetGhostStore);
		}
	};

}
