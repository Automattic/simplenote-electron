import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import {
	VISIBLE_PANES_ADD,
	VISIBLE_PANES_REMOVE,
	VISIBLE_PANES_SET
} from '../action-types';
import { DEFAULT_VISIBLE_PANES } from './constants';

const visiblePanes = ( state = DEFAULT_VISIBLE_PANES, { type, panes } ) => {
	switch ( type ) {
		case VISIBLE_PANES_ADD:
			return union( state, panes );
		case VISIBLE_PANES_REMOVE:
			return difference( state, panes );
		case VISIBLE_PANES_SET:
			return panes;

		default:
			return state;
	}
};

export default combineReducers( { visiblePanes } );
