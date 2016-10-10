
import React from 'react'
import App from './app'
import simperium from './simperium'
import store from './state'
import appState from './flux/app-state'
import { setAccountName } from './state/settings/actions';
import analytics from './analytics'
import { Auth } from 'simperium'
import { parse } from 'cookie'
import { render } from 'react-dom'
import { Provider } from 'react-redux'

const cookie = parse( document.cookie );
const auth = new Auth( config.app_id, config.app_key );

require( '../scss/app.scss' );

const token = cookie.token || localStorage.access_token;
const appId = config.app_id;

// Redirect to web sign in if running on App Engine
if ( ! token && config.is_app_engine ) {
	window.location = 'https://app.simplenote.com/signin';
}

const client = simperium( appId, token, {
	note: {
		beforeIndex: function( note ) {
			var systemTags = note.data && note.data.systemTags || [];
			var content = note.data && note.data.content || '';

			return {
				...note,
				contentKey: content.replace( /\s+/g, ' ' ).trim().slice( 0, 200 ).toLowerCase(),
				pinned: systemTags.indexOf( 'pinned' ) !== -1
			};
		},
		configure: function( objectStore ) {
			objectStore.createIndex( 'modificationDate', 'data.modificationDate' );
			objectStore.createIndex( 'creationDate', 'data.creationDate' );
			objectStore.createIndex( 'alphabetical', 'contentKey' );
		}
	},
	tag: function( objectStore ) {
		console.log( 'Configure tag', objectStore );
	}
}, 'simplenote', 40 );

const l = ( msg ) => {
	return function() {
		// if (window.loggingEnabled)
		console.log.apply( console, [msg].concat( [].slice.call( arguments ) ) );
	}
}

client
	.on( 'connect', l( 'Connected' ) )
	.on( 'disconnect', l( 'Not connected' ) )
	// .on( 'message', l('<=') )
	// .on( 'send', l('=>') )
	.on( 'unauthorized', l( 'Not authorized' ) );

client.on( 'unauthorized', () => {
	// if there is no token, drop data, if there is a token it could potentially just be
	// a password change or something similar so don't kill the data
	if ( token ) {
		return;
	}

	client.reset().then( () => {
		console.log( 'Reset complete' )
	} );
} );

const app = document.createElement( 'div' );

document.body.appendChild( app );

let props = {
	client: client,
	noteBucket: client.bucket( 'note' ),
	tagBucket: client.bucket( 'tag' ),
	onAuthenticate: ( username, password ) => {
		if ( ! ( username && password ) ) {
			return;
		}

		store.dispatch( appState.action( 'resetAuth' ) );
		auth.authorize( username, password )
			.then( user => {
				if ( ! user.access_token ) {
					return store
						.dispatch( appState.action( 'authFailed' ) );
				}

				store.dispatch( setAccountName( username ) );
				localStorage.access_token = user.access_token;
				client.setUser( user );
				analytics.tracks.recordEvent( 'user_signed_in' );
			} )
			.catch( () => {
				store.dispatch( appState.action( 'authFailed' ) )
			} );
	},
	onSignOut: () => {
		delete localStorage.access_token;
		store.dispatch( setAccountName( null ) );
		client.deauthorize();
		if ( config.signout ) {
			config.signout( function() {
				window.location = '/';
			} );
		}
		analytics.tracks.recordEvent( 'user_signed_out' );
	}
};

render(
	<Provider store={store}>
		<App {...props} />
	</Provider>,
	app
);
