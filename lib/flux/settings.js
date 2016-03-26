import ActionMap from './action-map'

var defaultFontSize = 16;

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
			sortType: 'modificationDate',
			sortReversed: false,
			theme: 'light',
			fontSize: defaultFontSize,
			noteDisplay: 'comfy'
		}, settings );
	},

	handlers: {
		updateSettings( state, { type, ...changes } ) {
			var settings = Object.assign( {}, state, changes );
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

		setDarkThemeActive: {
			creator() {
				return dispatch => {
					dispatch( this.action( 'updateSettings', { theme: 'dark' } ) );
				};
			}
		},

		setLightThemeActive: {
			creator() {
				return dispatch => {
					dispatch( this.action( 'updateSettings', { theme: 'light' } ) );
				};
			}
		}
	}
} );
