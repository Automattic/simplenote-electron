// A promise that's required to be resolved immediately
// not asyncronous
function P(resolver) {

	var self = this,
			reject = (error) => this.error = error,
			resolve = (result) => this.result = result,
			once = (fn) => {
				return function() {
					if (self.completed) {
						return;
					}
					self.completed = true;
					try {
						fn.apply(self, [].slice.apply(arguments));
					} catch (e) {
						reject(e);
					}

					if (self.deferred) {
						self.deferred.reduce((p, d) => p.then.apply(p, d), self);
					}
				}
			},
			deferred = [];

	this.completed = false;
	resolver(
		once(resolve),
		once(reject)
	);
}

P.prototype.defer = function(responder) {
	this.deferred = (this.deferred || []).concat([responder]);
}

P.prototype.then = function(success, failure) {
	// if not completed we need to wait
	if (!this.completed) {
		this.defer(arguments);
		return this;;
	}
	// defer until we have a result
	if (this.result){
		var next = success(this.result);
		if (next)
			return next;
	} 
	if (this.error && failure) failure(this.error);
	return this;
};

export { P as DBPromise }

export function transaction(database, perform) {
	return new Promise((resolve, reject) => {
		database.transaction(
			(tx)    => perform(tx, resolve, reject),
			(e) => {
				reject(e)
			}
		)
	});
}

export function exec(tx, statement, replacements) {
	return new P((resolve, reject) => {
		tx.executeSql(statement, replacements,
			(tx, result) => resolve(result),
			(tx, error) => reject(error)
		)
	});
}

export function read(database, statement, args) {
	return tx(database, statement, args, 'readTransaction');
}

export function write(database, statement, args) {
	return tx(database, statement, args, 'transaction');
}

function tx(database, statement, args, method) {
	return new Promise((resolve, reject) => {
		database[method](
			(tx) => {
				console.log("Execute SQL", statement, args);
				tx.executeSql(statement, args,
					(tx, result) => resolve(result),
					(tx, e) => reject(e)
				)
			},
			(tx, e) => reject(e)
		);
	});
}