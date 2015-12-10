const indexedDB = window.indexedDB
const setup = new Promise( function( resolve, reject ) {
	var open = indexedDB.open( 'ghost', 200 );

	open.onupgradeneeded = function( e ) {
		var db = e.target.result;
		var cv;
		var stores = db.objectStoreNames;
		var ghosts;

		if ( stores.contains( 'cv' ) ) {
			db.deleteObjectStore( 'cv' )
		}

		cv = db.createObjectStore( 'cv', {keyPath: 'bucket'} );
		cv.createIndex( 'bucket', 'bucket', {unique: true} );

		if ( stores.contains( 'ghosts' ) ) {
			db.deleteObjectStore( 'ghosts' )
		}

		ghosts = db.createObjectStore( 'ghosts', {keyPath: 'full_key'} );
		ghosts.createIndex( 'bucket', 'bucket' );
		ghosts.createIndex( 'full_key', 'full_key', {unique: true} );
	};

	open.onsuccess = function( e ) {
		var db = e.target.result;
		resolve( db );
	};

	open.onerror = function( e ) {
		console.error( 'failed to setup db' )
		reject( e.target.error );
	}
} );

indexedDB.onerror = function( e ) {
	console.error( 'Database error', e );
};

function GhostStore( bucket ) {
	this.bucket = bucket;
}

GhostStore.prototype.withDB = function( resolver ) {
	return setup.then( function( db ) {
		return new Promise( function( resolve, reject ) {
			return resolver( db, resolve, reject )
		} )
	} )
}

GhostStore.prototype.getChangeVersion = function() {
	return this.withDB( ( db, resolve, reject ) => {
		var tx = db.transaction( 'cv' ).objectStore( 'cv' ).get( this.bucket.name );
		tx.onsuccess = function( e ) {
			var record = e.target.result
			var cv = null
			if ( record ) {
				cv = record.cv;
			}
			resolve( cv );
		}
		tx.onerror = function( e ) {
			reject( e.target.result )
		}
	} )
}

GhostStore.prototype.setChangeVersion = function( cv ) {
	return this.withDB( ( db, resolve ) => {
		var tx = db.transaction( 'cv', 'readwrite' ).objectStore( 'cv' ).put( {bucket: this.bucket.name, cv: cv} );
		tx.onsuccess = function() {
			resolve();
		}
	} )
};

GhostStore.prototype.put = function( id, version, data ) {
	return this.withDB( ( db, resolve ) => {
		var tx = db.transaction( ['ghosts'], 'readwrite' ),
			ghosts = tx.objectStore( 'ghosts' ),
			full_key = this.bucket.name + '.' + id,
			ghost = {key: id, version: version, data: data, full_key: full_key, bucket: this.bucket.name};

		ghosts.put( ghost ).onsuccess = function( e ) {
			resolve( e.target.result );
		}
	} )
}

GhostStore.prototype.get = function( id ) {
	return this.withDB( ( db, resolve, reject ) => {
		var ghosts = db.transaction( 'ghosts' ).objectStore( 'ghosts' );
		var key = this.bucket.name + '.' + id;

		var request = ghosts.get( key );
		request.onsuccess = function( e ) {
			var ghost = e.target.result;
			if ( !ghost ) {
				ghost = { key: id, data: {} };
			}
			resolve( ghost );
		};
		request.onerror = function( e ) {
			var error = new Error( 'failed to get ghost ' + key );
			error.objectStoreEvent = e;
			reject( error );
		};
	} );
};

GhostStore.prototype.remove = function( id ) {
	return this.withDB( ( db, resolve, reject ) => {
		var ghosts = db.transaction( 'ghosts', 'readwrite' ).objectStore( 'ghosts' );
		var key = this.bucket.name + '.' + id;
		var request = ghosts.delete( key );

		request.onsuccess = function() {
			resolve();
		};

		request.onerror = function() {
			reject( new Error( 'Failed to delete ghost ' + key ) );
		};
	} );
};

GhostStore.prototype.eachGhost = function( onGhost ) {
	setup.then( ( db ) => {
		var request = db.transaction( 'ghosts' ).objectStore( 'ghosts' ).index( 'bucket' ).openCursor( IDBKeyRange.only( bucket.name ) );
		request.onsuccess = function( e ) {
			var cursor = e.target.result;
			if ( cursor ) {
				onGhost( cursor.value );
				cursor.continue();
			}
		}
	} )
}

module.exports = function( bucket ) {
	return new GhostStore( bucket );
};

module.exports.GhostStore = GhostStore;
module.exports.reset = function() {
	return setup.then( ( db ) => {
		return Promise.all( [].map.call( db.objectStoreNames, ( name ) => {
			return new Promise( ( resolve, reject ) => {
				var request = db.transaction( name, 'readwrite' ).objectStore( name ).clear();
				request.onsuccess = () => {
					resolve( name );
				}
				request.onerror = ( e ) => {
					reject( e );
				}
			} );
		} ) );
	} );
}
