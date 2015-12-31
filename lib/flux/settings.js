import ActionMap from './action-map'

var defaultFontSize = 18;

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
			theme: 'light',
			fontSize: defaultFontSize
		}, settings );
	},

	handlers: {
		updateSettings( state, { type, ...changes } ) {
			var settings = Object.assign( {}, state, changes );
			type; // lint
			localStorage.simpleNote = JSON.stringify( settings );
			return settings;
		},

		fontSizeBigger: {
			creator() {
				return ( dispatch, getState ) => {
					let { settings } = getState();
					// Max size of 30px
					let newFontSize = Math.min( settings.fontSize + 1, 30 );
					dispatch( this.action( 'updateSettings', { fontSize: newFontSize } ) );
				};
			}
		},

		fontSizeSmaller: {
			creator() {
				return ( dispatch, getState ) => {
					let { settings } = getState();
					// Min size of 10px
					let newFontSize = Math.max( settings.fontSize - 1, 10 );
					dispatch( this.action( 'updateSettings', { fontSize: newFontSize } ) );
				};
			}
		},

		fontSizeReset: {
			creator() {
				return dispatch => {
					// Reset to default font size
					dispatch( this.action( 'updateSettings', { fontSize: defaultFontSize } ) );
				};
			}
		},
	}
} );
