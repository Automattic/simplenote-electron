import {
	VISIBLE_PANES_ADD,
	VISIBLE_PANES_REMOVE,
	VISIBLE_PANES_SET,
} from '../action-types';
import { DEFAULT_VISIBLE_PANES } from './constants';

export const enterDistractionFree = () => ( {
	type: VISIBLE_PANES_SET,
	panes: [ 'editor' ],
} );

export const leaveDistractionFree = ( previousPanes = DEFAULT_VISIBLE_PANES ) => ( {
	type: VISIBLE_PANES_SET,
	panes: previousPanes,
} );

export const hideTagDrawer = () => ( {
	type: VISIBLE_PANES_REMOVE,
	panes: [ 'tagDrawer' ],
} );

export const showTagDrawer = () => ( {
	type: VISIBLE_PANES_ADD,
	panes: [ 'tagDrawer' ],
} );
