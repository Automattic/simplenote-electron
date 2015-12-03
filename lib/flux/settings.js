import ActionMap from './action-map'

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
			theme: 'light'
		}, settings );
	},

	handlers: {
		updateSettings( state, { type, ...changes } ) {
			var settings = Object.assign( {}, state, changes );
			type; // lint
			localStorage.simpleNote = JSON.stringify( settings );
			return settings;
		}
	}
} );
