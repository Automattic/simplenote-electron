import { Client } from 'simperium'
import Query from '../query'

export default function() {

	// TODO: sorting, filtering, etc
	Client.Bucket.prototype.query = function(fn) {
		var bucket = this,
				query = new Query(function(query) {
					return (new Promise(function(resolve, reject) {
						var objects = [];
						for (var id in bucket.store.objects) {
							objects.push({id: id, data: bucket.store.objects[id]})
						}
						resolve(objects);
					})).catch((e) => { console.error("Failed to query", e)})
				});

		if (fn) {
			query.exec(fn);
		}

		return query;
	};

}