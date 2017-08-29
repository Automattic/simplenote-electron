import {
	DISTRACTION_FREE_ENTER,
	DISTRACTION_FREE_LEAVE,
	TAG_DRAWER_HIDE,
	TAG_DRAWER_SHOW,
} from '../action-types';
import { DEFAULT_VISIBLE_PANES } from './constants';

export const enterDistractionFree = () => ( { type: DISTRACTION_FREE_ENTER } );

export const leaveDistractionFree = ( previousPanes = DEFAULT_VISIBLE_PANES ) => ( {
	type: DISTRACTION_FREE_LEAVE,
	previousPanes,
} );

export const hideTagDrawer = () => ( { type: TAG_DRAWER_HIDE } );

export const showTagDrawer = () => ( { type: TAG_DRAWER_SHOW } );
