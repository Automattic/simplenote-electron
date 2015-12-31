/**
 * Internal dependencies
 */
var loadScript = require( './load-script' ).loadScript,
	_user,
	_prefix;

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

	setUser: function( user ) {
		_user = user;
	},

	tracks: {
		recordEvent: function( eventName, eventProperties ) {
			eventProperties = eventProperties || {};

			if ( !_prefix ) {
				_prefix = analytics.getPlatformPrefix();
			}

			eventName = _prefix + eventName;

			// console.log( 'Record event "%s" called with props %s', eventName, JSON.stringify( eventProperties ) );

			if ( eventName.indexOf( 'splinux_' ) !== 0 && eventName.indexOf( 'spwindows_' ) !== 0 ) {
				return;
			}

			window._tkq.push( [ 'recordEvent', eventName, eventProperties ] );
		}
	},

	identifyUser: function() {
		// Don't identify the user if we don't have one
		if ( _user ) {
			window._tkq.push( [ 'identifyUser', _user, _user ] );
		}
	},

	clearedIdentity: function() {
		window._tkq.push( [ 'clearIdentity' ] );
	}
};

// Load tracking script
window._tkq = window._tkq || [];
loadScript( '//stats.wp.com/w.js?48' );

module.exports = analytics;
