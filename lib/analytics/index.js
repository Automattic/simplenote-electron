/**
 * Internal dependencies
 */
var user, prefix;
require( './tracks' );

const analytics = {

	initialize: function( initUser ) {
		analytics.setUser( initUser );
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

			//console.log( 'Record event "%s" called with props %s', eventName, JSON.stringify( eventProperties ) );
			if ( !eventName.includes( 'splinux_' ) && !eventName.includes( 'spwindows_' ) ) {
				return;
			}

			window._tkq.push( [ 'recordEvent', eventName, eventProperties ] );
		}
	},

	identifyUser: function() {
		// Don't identify the user if we don't have one
		if ( user ) {
			window._tkq.push( [ 'identifyUser', user, user ] );
		}
	},

	clearedIdentity: function() {
		window._tkq.push( [ 'clearIdentity' ] );
	}
};

// Load tracking script
window._tkq = window._tkq || [];

module.exports = analytics;
