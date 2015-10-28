var Promise = require('promise');

var db = window.indexedDB,
		setup = new Promise(function(resolve, reject) {
			var open = db.open('ghost', 200);

			open.onupgradeneeded = function(e) {

				var db = e.target.result;

				var stores = db.objectStoreNames;

				if (stores.contains('cv')) db.deleteObjectStore('cv');

				var cv = db.createObjectStore('cv', {keyPath : 'bucket'});
				cv.createIndex('bucket', 'bucket', {unique: true});

				if (stores.contains('ghosts')) db.deleteObjectStore('ghosts');
				var ghosts = db.createObjectStore('ghosts', {keyPath : 'full_key'});
				ghosts.createIndex('bucket', 'bucket');
				ghosts.createIndex('full_key', 'full_key', {unique: true});

			};

			open.onsuccess = function(e) {
				var db = e.target.result;
				resolve(db);
			};

			open.onerror = function(e) {
				reject(e.target.error);
			}

		});

setup.then(function() {
	// noop, setup as soon as possible
});

setup.catch(function(e) {
	console.error(e);
});

db.onerror = function(e) {
	console.log("Some kind of error", e);
};

function GhostStore(bucket) {
	this.bucket = bucket;
}

GhostStore.prototype.getChangeVersion = function(){
	var bucket = this.bucket;
	return new Promise(function(resolve, reject) {
		setup.then(function(db) {
			var tx = db.transaction('cv').objectStore('cv').get(bucket.name);
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

GhostStore.prototype.setChangeVersion = function(cv){
	var bucket = this.bucket;

	return new Promise(function(resolve, reject) {
		setup.then(function(db) {
			var tx = db.transaction('cv', 'readwrite').objectStore('cv').put({bucket: bucket.name, cv: cv});
			tx.onsuccess = function(e) {
				resolve();
			};
		});
	});
};

GhostStore.prototype.put = function(id, version, data){

	var self = this,
			bucket = this.bucket,
			promise = new Promise(function(resolve, reject) {
				setup.then(function(db) {

					var tx = db.transaction(['ghosts'], 'readwrite'),
							ghosts = tx.objectStore('ghosts'),
							full_key = bucket.name + "." + id,
							ghost = {key: id, version: version, data: data, full_key: full_key, bucket: bucket.name};

					ghosts.put(ghost).onsuccess = function(e) {
						resolve(e.target.result);
					};

				});
			});
	return promise;
};

GhostStore.prototype.get = function(id){
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
						var error = new Error("failed to get ghost " + key);
						error.objectStoreEvent = e;
						reject(error);
					};
				});
			});

	return promise;
};

GhostStore.prototype.remove = function(id) {
	var self = this,
			bucket = this.bucket,
			promise = new Promise(function(resolve, reject) {
				setup.then(function(db) {
					var ghosts = db.transaction('ghosts', 'readwrite').objectStore('ghosts');
					var key = bucket.name + '.' + id;
					var request = ghosts.delete(key);

					request.onsuccess = function() {
						resolve();
					};

					request.onerror = function() {
						reject(new Error("Failed to delete ghost " + key));
					};

				});
			});

	return promise;

};

GhostStore.prototype.eachGhost = function(onGhost) {
	var self = this,
			bucket = this.bucket;

	setup.then(function(db) {
		var request = db.transaction('ghosts').objectStore('ghosts').index('bucket').openCursor(IDBKeyRange.only(bucket.name));
		request.onsuccess = function(e) {
			var cursor = e.target.result;
			if (cursor) {
				onGhost(cursor.value);
				cursor.continue();
			}
		};
	}, function() {
		console.log("Failed!");
	});

};

module.exports = function(bucket) {
	return new GhostStore(bucket);
};

module.exports.GhostStore = GhostStore;
module.exports.reset = function() {
	return setup.then((db) => {
		return Promise.all([].map.call(db.objectStoreNames, (name) => {
			return new Promise((resolve, reject) => {
				var request = db.transaction(name, 'readwrite').objectStore(name).clear();
				request.onsuccess = (e) => {
					resolve(name);
				}
				request.onerror = (e) => {
					reject(e);
				}
			});
		}));
	});
}