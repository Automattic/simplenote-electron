import { Client } from 'simperium'
import bucket_store from './bucket-store'
import ghost_store, { reset as resetGhosts } from './ghost-store'
import Promise from 'promise'
import Query from '../query'

export default function configure(database, version, config) {

	// TODO: expand query interface for potential sorting/filtering conditions
	function performQuery(db, query, bucket) {
		return new Promise(function(resolve, reject) {

			var order = "next";

			var openRequest = query.getSortConstraints().slice(-1).reduce(
				(objectStore, sort) => {
					order = sort[1] === 1 ? "next" : "prev";
					return objectStore.index(sort[0]);
				},
				db.transaction(bucket.name).objectStore(bucket.name)
			).openCursor(null, order);

			var results = [];
			openRequest.onsuccess = function(e) {
				var cursor = e.target.result;
				if (cursor) {
					results.push(cursor.value);
					cursor.continue();
				} else {
					resolve(results);
				}
			};
			openRequest.onerror = (e) => reject(e.targer.error);
		});
	}

	// monkey-patch the query interface to rely setup being ready
	Client.Bucket.prototype.query = function(fn) {
		const store = this.store,
					bucket = this;

		var query = new Query(function(query) {
			return store.setup.then(
					(db) => performQuery(db, query, bucket),
					(e) => console.error("Failed to query %s", bucket.name, e)
				);
		});

		if (fn) {
			query.exec(fn);
		}
		return query;
	}

	// this.props.notes.query(function(db) {
	// 	var notes = [];
	// 	// TODO: refactor indexeddb interface
	// 	db.transaction('note').objectStore('note').index('pinned-sort').openCursor(null, 'prev').onsuccess = function(e) {
	// 		var cursor = e.target.result;
	// 		if (cursor) {
	// 			notes.push(cursor.value);
	// 			cursor.continue();
	// 		} else {
	// 			done(null, notes);
	// 		}
	// 	};
	// });

	return new Store(database, version, config);

}

function Store(database, version, config) {

	// we need to
	this.objectDB = bucket_store(function(resolve, reject) {
		var openRequest = window.indexedDB.open(database, version);
		var upgraded = false;

		openRequest.onupgradeneeded = function(e) {
			upgraded = true;
			var db = e.target.result;

			var stores = db.objectStoreNames;
			var objectStore;

			for (var name in config) {
				var setup = config[name];
				if (typeof setup !== 'function') {
					setup = setup.configure;
				}
				if (stores.contains(name))	db.deleteObjectStore(name);
				objectStore = db.createObjectStore(name, { keyPath: 'id' });
				setup(objectStore);
			}

		};

		openRequest.onerror = function(e) {
			reject(e);
		};

		openRequest.onsuccess = function(e) {
			// if we upgraded we want to refresh object stores with the ghost stores
			var bucketDB = e.target.result;
			resolve(e.target.result);

			if (!upgraded) return;

			// TODO: if the db was upgraded, tell the buckets to reload their data
			console.warn("Need to reload");

		};
	});

	var objectProvider = this.objectDB.provider();

	this.objectStoreProvider = function(bucket) {
		var store = objectProvider.apply(null, arguments);
		if (config[bucket.name].beforeIndex) {
			store.beforeIndex = config[bucket.name].beforeIndex;
		}
		return store;
	};

	this.ghostStoreProvider = ghost_store;

}

Store.prototype.reset = function() {
	return this.objectDB.reset()
					.then(resetGhosts.reset())
}
