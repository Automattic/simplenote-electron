/**
 * Internal dependencies
 */
var loadScript = require( './load-script' ).loadScript,
	user,
	prefix;

var analytics = {

	initialize: function( user ) {
		analytics.setUser( user );
		analytics.identifyUser();
	},

	getPlatformPrefix: function() {
		if ( navigator.appVersion.indexOf( 'Win' ) !== -1 ) {
			return 'spwindows_';
		} else if ( navigator.appVersion.indexOf( 'Linux' ) !== -1 ) {
			return 'splinux_';
		}

		return 'unknown_';
	},

	setUser: function( newUser ) {
		user = newUser;
	},

	tracks: {
		recordEvent: function( eventName, eventProperties ) {
			eventProperties = eventProperties || {};

			if ( !prefix ) {
				prefix = analytics.getPlatformPrefix();
			}

			eventName = prefix + eventName;

			// console.log( 'Record event "%s" called with props %s', eventName, JSON.stringify( eventProperties ) );

			if ( eventName.indexOf( 'splinux_' ) !== 0 && eventName.indexOf( 'spwindows_' ) !== 0 ) {
				return;
			}

			window.tkq.push( [ 'recordEvent', eventName, eventProperties ] );
		}
	},

	identifyUser: function() {
		// Don't identify the user if we don't have one
		if ( user ) {
			window.tkq.push( [ 'identifyUser', user, user ] );
		}
	},

	clearedIdentity: function() {
		window.tkq.push( [ 'clearIdentity' ] );
	}
};

// Load tracking script
window.tkq = window.tkq || [];
loadScript( '//stats.wp.com/w.js?48' );

module.exports = analytics;
