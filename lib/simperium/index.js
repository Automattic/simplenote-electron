import simperium, { Bucket } from 'simperium'
import bucket_store from './bucket-store'
import ghost_store from './ghost-store'
import { inherits } from 'util'
import { EventEmitter } from 'events'

export const Auth = simperium.Auth

export default function( appID, token, bucketConfig, database, version ) {
	return new BrowserClient( appID, token, bucketConfig, database, version );
};

Bucket.prototype.query = function( fn ) {
	this.store.setup.then( fn );
};

function BrowserClient( appID, token, bucketConfig, database, version ) {
	var config = this.bucketConfig = bucketConfig;
	var objectStoreProvider
	var bucketName

	this.databaseName = database || 'simperium-objects';
	this.databaseVersion = version || 1;
	this.bucketDB = bucket_store( this.configureDb.bind( this ) );
	this.buckets = {};

	objectStoreProvider = this.bucketDB.provider();
	this.ghostStore = ghost_store;

	this.client = simperium( appID, token, {
		// url: 'ws://localhost:5331',
		ghostStoreProvider: ghost_store,
		objectStoreProvider: function( bucket ) {
			var store = objectStoreProvider.apply( null, arguments );
			if ( config[bucket.name].beforeIndex ) {
				store.beforeIndex = config[bucket.name].beforeIndex;
			}
			return store;
		}
	} );

	['send', 'message', 'connect', 'reconnect', 'disconnect', 'unauthorized'].forEach( ( event ) => {
		this.client.on( event, this.emit.bind( this, event ) );
	} );

	for ( bucketName in bucketConfig ) {
		this.buckets[bucketName] = this.client.bucket( bucketName );
	}
}

inherits( BrowserClient, EventEmitter );

BrowserClient.prototype.configureDb = function( resolve ) {
	var openRequest = window.indexedDB.open( this.databaseName, this.databaseVersion );
	var upgraded = false;

	openRequest.onupgradeneeded = ( e ) => {
		var db = e.target.result
		var stores = db.objectStoreNames
		var objectStore
		var name
		var setup

		upgraded = true;

		for ( name in this.bucketConfig ) {
			setup = this.bucketConfig[name];
			if ( typeof setup !== 'function' ) {
				setup = setup.configure;
			}
			if ( stores.contains( name ) ) db.deleteObjectStore( name );
			objectStore = db.createObjectStore( name, { keyPath: 'id' } );
			setup( objectStore );
		}
	}

	openRequest.onerror = function( e ) {
		console.error( 'Failed to configure database', e )
	}

	openRequest.onsuccess = ( e ) => {
		var name
		// if we upgraded we want to refresh object stores with the ghost stores
		global.bucketDB = e.target.result;
		resolve( e.target.result )

		if ( !upgraded ) return;

		// reload buckets
		for ( name in this.buckets ) {
			this.buckets[name].reload()
		}
	}
}

BrowserClient.prototype.isAuthorized = function() {
	return !!this.client.accessToken;
}

BrowserClient.prototype.reset = function() {
	return this.bucketDB.reset()
	.then(
		() => {
			return ghost_store.reset()
		},
		( e ) => {
			console.error( 'Failed to reset', e )
		}
	)
};

BrowserClient.prototype.bucket = function( name ) {
	return this.buckets[name];
};

BrowserClient.prototype.setUser = function( user ) {
	// todo, set the user access token and have the buckets reconnect
	this.client.setAccessToken( user.access_token );
	this.emit( 'authorized' );
};

BrowserClient.prototype.deauthorize = function() {
	this.client.setAccessToken( null );
	this.emit( 'unauthorized' );
	this.client.disconnect();
	this.reset();
}
