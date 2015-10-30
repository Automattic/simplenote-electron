import { transaction, exec, read, write } from './util'
import Promise from 'promise'
import Query from '../query'

export function setup(name, version, config) {
	var database = window.openDatabase(name, new String(version), 'Simplenote', 1024 * 1024 * 2);
	return Promise.resolve(database)
	.then( (database) => transaction( database, (tx, resolve, reject) => {
		// exec(tx, "DROP TABLE IF EXISTS objects")
		exec(tx, "CREATE TABLE IF NOT EXISTS objects (row INTEGER PRIMARY KEY AUTOINCREMENT, id VARCHAR(255), bucket VARCHAR(63), data TEXT, UNIQUE(id, bucket))")
		.then(() => resolve(database), reject)
	}));
}

export function reset(database) {
	return transaction( database, (tx, resolve, reject) => {
		exec(tx, "DELETE FROM objects")
		.then(resolve, reject)
	});
}

export default function BucketStore(setup, bucket, config) {
	this.setup = setup;
	this.bucket = bucket;
	this.config = config;
	// TODO: create indexes based on configuration data
}


BucketStore.prototype.update = function(id, data, fn) {
	// TODO: Store indexes based on configuration data
	return this.setup.then((database) => new Promise((resolve, reject) => {
		var indexer = this.config && this.config.beforeIndex ? this.config.beforeIndex : (o) => o,
				o = {id: id, data: data},
				indexed = indexer(o);

		write(database, "INSERT OR REPLACE INTO objects (id, bucket, data) VALUES (?, ?, ?)", [id, this.bucket.name, JSON.stringify(o)])
		.then(
			() => {
				fn(null);
				resolve();
			},
			(e) => {
				fn(e);
				reject(e);
			}
		)		
	}))
	.catch((e) => console.error("Failed to update object", e));
};

BucketStore.prototype.get = function(id, fn) {
	this.setup.then(
		(database) => {
			read(database, "SELECT data FROM objects WHERE bucket = ? AND id = ?", [this.bucket.name, id])
			.then(
				(result) => {
					const { data } = result.rows.item(0);
					fn(null, JSON.parse(data));
				},
				fn
			)
		},
		fn
	);
}

BucketStore.prototype.query = function(fn) {

	// TODO: support sorting on indexes

	var query = new Query(() => new Promise((resolve, reject) => {

		this.setup.then((database) => {
			var error = new Error("Query the database");
			error.database = database;
			read(database, "SELECT data, id FROM objects WHERE bucket = ?", [this.bucket.name])
			.then(
				(result) => {
					var items = [];
					for (var i = 0; i < result.rows.length; i ++) {
						var { data, id } = result.rows.item(i);
						items.push(JSON.parse(data));
					}
					resolve(items);
				},
				reject
			)
		});

	}));

	if (fn) {
		query.exec(fn);
	}

	return query;
	
};