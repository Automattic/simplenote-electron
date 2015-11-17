
export default class ActionMap {

	constructor( { namespace, initialState, handlers } ) {
		this.namespace = namespace;
		this.initialState = initialState;
		this.actionCreators = {};
		this.actionReducers = {};

		namespace = namespace ? `${namespace}.` : '';

		for ( let name in handlers ) {
			if ( handlers.hasOwnProperty( name ) ) {
				let handler = handlers[name];

				if ( typeof handler === 'function' ) {
					this.actionCreators[ name ] = actionCreator.bind( `${namespace}${name}` );
					this.actionReducers[ `${namespace}${name}` ] = handler;
				} else {
					this.actionCreators[ name ] = handler.creator.bind( this ) || actionCreator.bind( `${namespace}${name}` );
					this.actionReducers[ `${namespace}${name}` ] = handler.reducer;
				}
			}
		}
	}

	action( name, ...params ) {
		return this.actionCreators[ name ].apply( this, params );
	}

	reducer( state, action ) {
		if ( state == null ) {
			if ( typeof this.initialState === 'function' ) {
				state = this.initialState();
			} else {
				state = this.initialState;
			}
		}

		let fn = this.actionReducers[ action.type ];
		if ( typeof fn === 'function' ) {
			state = fn( state, action ) || state;
		}

		return state;
	}
}

export function actionCreator() {
	return Object.assign( { type: this }, ...arguments );
}
