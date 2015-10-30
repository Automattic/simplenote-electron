import { Client } from 'simperium'
import Query from '../query'

export default function(database, version, config) {

	// TODO: sorting, filtering, etc
	Client.Bucket.prototype.query = function(fn) {
		var bucket = this,
				query = new Query(function(query) {
					return (new Promise(function(resolve, reject) {
						var objects = [];
						for (var id in bucket.store.objects) {
							objects.push(bucket.store.objects[id]);
						}
						resolve(objects);
					})).catch((e) => { console.error("Failed to query", e)})
				});

		if (fn) {
			query.exec(fn);
		}

		return query;
	};

	return {
		objectStoreProvider: function(bucket) {
			return new BucketStore(bucket, config[bucket.name]);
		},
		reset: function() {
			// TODO: all bucket and ghost data needs to be dropped
		}
	};

}

module.exports = function(user, bucket){
  return new BucketStore();
};

// TODO: support custom indexes
function BucketStore(bucket, config) {
  this.objects = {};
	this.config = config;
}

module.exports.BucketStore = BucketStore;

BucketStore.prototype.get = function(id, callback) {
  callback(null, this.objects[id]);
};

BucketStore.prototype.update = function(id, object, callback) {
	var beforeIndex = this.config && this.config.beforeIndex ? this.config.beforeIndex : (o) => o;
  this.objects[id] = beforeIndex({id: id, data: object});
  callback(null, this.objects[id]);
};

BucketStore.prototype.remove = function(id, callback) {
  delete this.objects[id];
  callback(null);
};

BucketStore.prototype.find = function(query, callback) {
  var objects = [];
  for (key in this.objects) {
    objects.push(this.objects[key]);
  }
  callback(null, objects);
}

