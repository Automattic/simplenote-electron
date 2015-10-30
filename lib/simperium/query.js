import Promise from 'promise'

export default function Query(resolver) {
	this.resolver = resolver;
	this.sortConstraints = [];
}

Query.prototype.sortBy = function(field, order) {
	this.sortConstraints.push([field, order]);
	return this;
};

Query.prototype.getSortConstraints = function() {
	return this.sortConstraints.slice();
}

Query.prototype.exec = function(fn) {
	return Promise.resolve(this)
		.then(this.resolver)
		.catch((e) => console.warn("Failed to perform query", e))
		.then(
			(results) => fn(null, results),
			(e) => fn(e)
		);
};
