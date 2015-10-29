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
		.then(
			(results) => fn(null, results),
			(e) => fn(e)
		)
		.catch(
			(e) => console.error("Failed to execute query", e)
		);
};
