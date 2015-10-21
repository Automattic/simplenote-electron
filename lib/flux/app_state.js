import store from './store';

const types = {
	selectNote: 'APP-STATE-SELECT-NOTE'
};

export const actions = {
	selectNote( id ) {
		return {
			type: types.selectNote,
			id
		}
	}
};

export default function reducer( state = {}, action ) {
	switch ( action.type ) {
		case types.selectNote:
			return Object.assign( {}, state, {
				selectedNote: action.id
			} );

		default: return state;
	}
}

export function getSelectedNote() {
	return store.getState().appState.selectedNote;
}
