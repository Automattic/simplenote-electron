import { union } from 'lodash';
import { combineReducers } from 'redux';
import {
	DISTRACTION_FREE_ENTER,
	DISTRACTION_FREE_LEAVE,
	TAG_DRAWER_HIDE,
	TAG_DRAWER_SHOW
} from '../action-types';
import { DEFAULT_VISIBLE_PANES } from './constants';

const visiblePanes = ( state = DEFAULT_VISIBLE_PANES, action ) => {
	switch ( action.type ) {
		case DISTRACTION_FREE_ENTER:
			return [ 'editor' ];
		case DISTRACTION_FREE_LEAVE:
			return action.previousPanes || DEFAULT_VISIBLE_PANES;
		case TAG_DRAWER_HIDE:
			return state.filter( pane => 'tagDrawer' !== pane );
		case TAG_DRAWER_SHOW:
			return union( state, [ 'tagDrawer' ] );
		default:
			return state;
	}
};

export default combineReducers( { visiblePanes } );
