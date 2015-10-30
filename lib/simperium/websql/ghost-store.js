import Promise from 'promise'
import { transaction, exec, read, write } from './util'

export function setup() {
  // private static final String CREATE_TABLE_GHOSTS="CREATE TABLE IF NOT EXISTS ghosts (id INTEGER PRIMARY KEY AUTOINCREMENT, bucketName VARCHAR(63), simperiumKey VARCHAR(255), version INTEGER, payload TEXT, UNIQUE(bucketName, simperiumKey) ON CONFLICT REPLACE)";
  // private static final String CREATE_TABLE_CHANGE_VERSIONS="CREATE TABLE IF NOT EXISTS changeVersions (id INTEGER PRIMARY KEY AUTOINCREMENT, bucketName VARCHAR(63), changeVersion VARCHAR(255), UNIQUE(bucketName))";
	
	return Promise.resolve(window.openDatabase('ghosts', 200, 'Simperium', 1024 * 1024 * 2))
	.then((database) => transaction(database, (tx, resolve, reject) => {
		exec(tx, "CREATE TABLE IF NOT EXISTS ghosts (id VARCHAR(255), bucket VARCHAR(63), version INTEGER, data TEXT, UNIQUE(bucket, id) ON CONFLICT REPLACE)")
		.then(() => exec(tx, "CREATE TABLE IF NOT EXISTS change_versions (bucket VARCHAR(63), cv VARCHAR(255), UNIQUE(bucket))"))
		.then(
			() => { resolve(database) },
			reject
		)})
	);
}

export function reset(database) {
	return transaction(database, (tx, resolve, reject) => {
		exec(tx, "DELETE FROM ghosts")
		.then( () => exec(tx, "DELETE FROM change_versions"))
		.then(resolve, reject);
	});
}


export default function GhostStore(setup, bucket) {
	this.setup = setup;
	this.bucket = bucket;
}

GhostStore.prototype.getChangeVersion = function() {
	var bucket = this.bucket;
	return this.setup.then((database) => {
		return new Promise((resolve, reject) => {
			read(database, "SELECT * FROM change_versions WHERE bucket = ?", [bucket.name])
			.then((result) => {
				if (result.rows.length == 0) {
					return resolve(null);
				} else {
					var row = result.rows.item(0);
					resolve(row.cv);
				}
			})
		});
	});
};

GhostStore.prototype.setChangeVersion = function(cv) {
	var bucket = this.bucket;
	return this.setup.then((database) => {
		return new Promise((resolve, reject) => {
			write(database, "INSERT OR REPLACE INTO change_versions (bucket, cv) VALUES(?, ?)", [bucket.name, cv])
			.then(resolve, reject);
		});
	})
};

GhostStore.prototype.put = function(id, version, data) {
	var bucket = this.bucket;
	return this.setup.then((database) => {
		return new Promise((resolve, reject) => {
			write(
				database,
				"INSERT OR REPLACE INTO ghosts (bucket, id, version, data) VALUES (?, ?, ?, ?)",
				[bucket.name, id, version, JSON.stringify(data)]
			)
			.then(resolve, reject)
		});
	})
}

GhostStore.prototype.get = function(id) {
	var bucket = this.bucket;
	return this.setup.then((database) => new Promise((resolve, reject) => {
		read(database, "SELECT version, data FROM ghosts WHERE bucket = ? AND id = ?", [bucket.name, id]).then(
			(result) => {
				if (result.rows.length == 0) {
					resolve({key: id, data: {}})
				} else {
					var data = result.rows.item(0);
					resolve({key: id, version: data.version, data: JSON.parse(data.data)});
				}
			},
			reject
		)
		.catch((e) => console.error("Failed to retrieve ghost", e));
	}));
}

GhostStore.prototype.remove = function(id) {
	var bucket = this.bucket;
	return this.setup.then((database) => new Promise((resolve, reject) => {
		write(database, "DELETE FROM ghosts WHERE bucket = ? AND id = ?", [bucket.name, id])
		.then(resolve, reject);
	}));
}
