window.wpcom = window.wpcom || {};
window._tkq = window._tkq || [];

window.wpcom.tracks = ( function() {
	var userId, userIdType, userLogin,
		localCache = {},
		context = {},
		pixel = 'https://pixel.wp.com/t.gif',
		cookieDomain = null,
		cookiePrefix = 'tk_',
		testCookie = 'tc',
		userNameCookie = 'ni',
		userAnonCookie = 'ai',
		queriesCookie = 'qs',
		queriesTTL = 1800,
		queriesPending = {};

	var getCookie = function( key ) {
		var name = cookiePrefix + encodeURIComponent( key ).replace( /[\-\.\+\*]/g, '\\$&' ),
			pattern = new RegExp( '(?:(?:^|.*;)\\s*' + name + '\\s*\\=\\s*([^;]*).*$)|^.*$' );
		return decodeURIComponent( document.cookie.replace( pattern, '$1' ) ) || null;
	};

	var checkCookieDomain = function( domain ) {
		var time = ( new Date ).getTime();
		document.cookie = cookiePrefix + testCookie + '=' + time + '; domain=' + domain + '; path=/;';
		return getCookie( testCookie ) === time;
	};

	var getCookieDomain = function() {
		if ( cookieDomain == null ) {
			cookieDomain = '';
			let host = document.location.host.toLowerCase().split( ':' )[0],
				tokens = host.split( '.' ),
				tryDomain;
			if ( typeof TRACKS_COOKIE_DOMAIN !== 'undefined' ) {
				cookieDomain = TRACKS_COOKIE_DOMAIN;
			} else {
				for ( let i = 1; i <= tokens.length; ++i ) {
					tryDomain = '.' + tokens.slice( -i ).join( '.' );
					if ( checkCookieDomain( tryDomain ) ) {
						cookieDomain = tryDomain;
						break;
					}
				}
			}
			if ( cookieDomain !== '' ) {
				cookieDomain = '; domain=' + cookieDomain;
			}
		}
		return cookieDomain;
	};

	// Set a first-party cookie (same domain only, default 5 years)
	var setCookie = function( key, value, seconds ) {
		var name = cookiePrefix + encodeURIComponent( key ),
			date = new Date();
		if ( 'undefined' === typeof seconds ) {
			seconds = 15768E4;
		}
		date.setTime( date.getTime() + seconds * 1E3 );
		document.cookie = name + '=' + encodeURIComponent( value ) +
			getCookieDomain() + '; path=/; expires=' + date.toUTCString();
	};

	var get = function( key ) {
		return getCookie( key ) || localCache[ key ];
	};

	var set = function( key, value, ttl ) {
		localCache[ key ] = value;
		setCookie( key, value, ttl );
	};

	var loadWpcomIdentity = function() {
		var wpcomCookie = getCookie( 'wordpress' ) || getCookie( 'wordpress_sec' ) || getCookie( 'wordpress_loggedin' );
		if ( wpcomCookie ) {
			return get( userNameCookie );
		}
	};

	var newAnonId = function() {
		var randomBytesLength = 18, // 18 * 4/3 = 24
			randomBytes = [];

		if ( window.crypto && window.crypto.getRandomValues ) {
			randomBytes = new Uint8Array( randomBytesLength );
			window.crypto.getRandomValues( randomBytes );
		} else {
			for ( let i = 0; i < randomBytesLength; ++i ) {
				randomBytes[ i ] = Math.floor( Math.random() * 256 );
			}
		}

		return btoa( String.fromCharCode.apply( String, randomBytes ) );
	}

	var loadIdentity = function() {
		if ( userId ) {
			return;
		}
		userId = loadWpcomIdentity();
		if ( userId ) {
			userIdType = 'wpcom:user_id';
		} else {
			userIdType = 'anon';
			userId = get( userAnonCookie );
			if ( !userId ) {
				userId = newAnonId();
				set( userAnonCookie, userId );
			}
		}
	};

	var getQueries = function() {
		var queries = get( queriesCookie );
		return queries ? queries.split( ' ' ) : [];
	};

	var bot = function() {
		// https://github.com/tobie/ua-parser/blob/master/regexes.yaml
		return !!navigator.userAgent.match( /bingbot|bot|borg|google(^tv)|yahoo|slurp|msnbot|msrbot|openbot|archiver|netresearch|lycos|scooter|altavista|teoma|gigabot|baiduspider|blitzbot|oegp|charlotte|furlbot|http%20client|polybot|htdig|ichiro|mogimogi|larbin|pompos|scrubby|searchsight|seekbot|semanticdiscovery|silk|snappy|speedy|spider|voila|vortex|voyager|zao|zeal|fast\-webcrawler|converacrawler|dataparksearch|findlinks|crawler|Netvibes|Sogou Pic Spider|ICC\-Crawler|Innovazion Crawler|Daumoa|EtaoSpider|A6\-Indexer|YisouSpider|Riddler|DBot|wsr\-agent|Xenu|SeznamBot|PaperLiBot|SputnikBot|CCBot|ProoXiBot|Scrapy|Genieo|Screaming Frog|YahooCacheSystem|CiBra|Nutch/ );
	};

	var saveQueries = function( queries ) {
		while ( queries.join( ' ' ).length > 2048 ) {
			queries = queries.slice( 1 );
		}
		set( queriesCookie, queries.join( ' ' ), queriesTTL );
	};

	var removeQuery = function( query ) {
		var i, toSave = [], queries = getQueries();
		for ( i = 0; i < queries.length; ++i ) {
			if ( query !== queries[ i ] ) {
				toSave.push( queries[ i ] );
			}
		}
		saveQueries( toSave );
	};

	var saveQuery = function( query ) {
		removeQuery( query );
		let queries = getQueries();
		queries.push( query );
		saveQueries( queries );
	};

	var getPixel = function( query ) {
		if ( !bot() ) {
			if ( query in queriesPending ) {
				return;
			}
			queriesPending[query] = true;
			let img = new Image();
			saveQuery( query );
			img.query = query;
			img.onload = function() {
				delete queriesPending[query];
				if ( img ) {
					removeQuery( img.query );
				}
			};
			// Add request timestamp just before the request
			img.src = pixel + '?' + query + '&_rt=' + ( new Date ).getTime() + '&_=_';
		}
	};

	var retryQueries = function() {
		getQueries().forEach( getPixel );
	};

	// Deep copy, optionally into another object
	var clone = function( obj, target ) {
		if ( obj == null || 'object' !== typeof obj )
			return obj;
		if ( target == null || 'object' !== typeof target )
			target = obj.constructor();
		for ( const key in obj ) {
			if ( obj.hasOwnProperty( key ) ) {
				target[ key ] = clone( obj[ key ] );
			}
		}
		return target;
	};

	var serialize = function( obj ) {
		var str = [];
		for ( const p in obj ) {
			if ( obj.hasOwnProperty( p ) ) {
				str.push( encodeURIComponent( p ) + '=' + encodeURIComponent( obj[ p ] ) );
			}
		}
		return str.join( '&' );
	};

	var send = function( query ) {
		loadIdentity();
		retryQueries();
		query._ui = userId;
		query._ut = userIdType;
		if ( userLogin ) {
			query._ul = userLogin;
		}
		let date = new Date();
		query._ts = date.getTime();
		query._tz = date.getTimezoneOffset() / 60;

		const nav = window.navigator;
		const screen = window.screen;
		query._lg = nav.language;
		query._pf = nav.platform;
		query._ht = screen.height;
		query._wd = screen.width;

		const sx = ( window.pageXOffset !== undefined ) ? window.pageXOffset : ( document.documentElement || document.body.parentNode || document.body ).scrollLeft;
		const sy = ( window.pageYOffset !== undefined ) ? window.pageYOffset : ( document.documentElement || document.body.parentNode || document.body ).scrollTop;

		query._sx = ( sx !== undefined ) ? sx : 0;
		query._sy = ( sy !== undefined ) ? sy : 0;

		if ( document.location !== undefined ) {
			query._dl = document.location.toString();
		}
		if ( document.referrer !== undefined ) {
			query._dr = document.referrer;
		}

		clone( context, query );
		getPixel( serialize( query ) );
	};

	var recordEvent = function( eventName, eventProps ) {
		if ( '_setProperties' === eventName ) {
			return;
		}

		eventProps = eventProps || {};
		eventProps._en = eventName;

		send( eventProps );
	};

	var identifyUser = function( newUserId, newUserLogin ) {
		if ( newUserLogin ) {
			userLogin = newUserLogin;
		}

		if ( '0' === newUserId || '' === newUserId || null === newUserId || userId === newUserId ) {
			return;
		}

		userId = newUserId;
		userIdType = 'wpcom:user_id';
		set( userNameCookie, userId );
		const anonId = get( userAnonCookie );
		if ( anonId ) {
			send( {
				_en: '_aliasUser',
				anonId: anonId
			} );
		}
		set( userAnonCookie, '', -1 );
	};

	var clearIdentity = function() {
		userId = null;
		userLogin = null;
		set( userNameCookie, '', -1 );
		set( userAnonCookie, '', -1 );
		loadIdentity();
	};

	var setProperties = function( properties ) {
		properties._en = '_setProperties';

		send( properties );
	};

	var storeContext = function( c ) {
		if ( 'object' !== typeof c ) {
			return;
		}
		context = c;
	};

	var API = {
		storeContext: storeContext,
		identifyUser: identifyUser,
		recordEvent: recordEvent,
		setProperties: setProperties,
		clearIdentity: clearIdentity
	};

	// <3 KM
	var TKQ = function( q ) {
		this.a = 1;
		if ( q && q.length ) {
			for ( let i = 0; i < q.length; i++ ) {
				this.push( q[ i ] );
			}
		}
	};

	var initQueue = function() {
		if ( !window._tkq.a ) {
			retryQueries();
			window._tkq = new TKQ( window._tkq );
		}
	};

	TKQ.prototype.push = function( args ) {
		if ( args ) {
			if ( 'object' === typeof args && args.length ) {
				const cmd = args.splice( 0, 1 );
				if ( API[ cmd ] ) API[ cmd ].apply( null, args );
			} else if ( 'function' === typeof args ) {
				args();
			}
		}
	};

	initQueue();

	return API;
} )();
