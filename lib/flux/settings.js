import ActionMap from './action-map'

var _require, webFrame;

try {
	_require = __non_webpack_require__;
	webFrame = _require( 'web-frame' );
} catch ( e ) {
	_require = null;
}

export default new ActionMap( {
	namespace: 'Settings',

	initialState() {
		var settings;

		try {
			settings = JSON.parse( localStorage.simpleNote ) || {};
		} catch ( e ) {
			settings = {};
		}

		return Object.assign( {
			theme: 'light'
		}, settings );
	},

	handlers: {
		updateSettings( state, { type, ...changes } ) {
			var settings = Object.assign( {}, state, changes );
			type; // lint
			localStorage.simpleNote = JSON.stringify( settings );
			return settings;
		},

		applySettings: {
			creator() {
				return ( dispatch, getState ) => {
					var { settings } = getState();
					if ( webFrame ) {
						webFrame.setZoomLevel( settings.zoomLevel | 0 );
					}
				};
			}
		},

		fontSizeBigger: {
			creator() {
				return dispatch => {
					if ( webFrame ) {
						let zoomLevel = webFrame.getZoomLevel() + 1;
						webFrame.setZoomLevel( zoomLevel );
						dispatch( this.action( 'updateSettings', { zoomLevel } ) );
					}
				};
			}
		},

		fontSizeSmaller: {
			creator() {
				return dispatch => {
					if ( webFrame ) {
						let zoomLevel = webFrame.getZoomLevel() - 1;
						webFrame.setZoomLevel( zoomLevel );
						dispatch( this.action( 'updateSettings', { zoomLevel } ) );
					}
				};
			}
		},

		fontSizeReset: {
			creator() {
				return dispatch => {
					if ( webFrame ) {
						let zoomLevel = 0;
						webFrame.setZoomLevel( zoomLevel );
						dispatch( this.action( 'updateSettings', { zoomLevel } ) );
					}
				};
			}
		},
	}
} );
