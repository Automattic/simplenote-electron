import {
	get,
	partial,
} from 'lodash';

import {
	COLLECTION_SELECT,
} from '../action-types';

export const selectTag = tag => ( {
	type: COLLECTION_SELECT,
	collectionName: get( tag, 'data.name', 'All Notes' ),
} );

export const selectAllNotes = partial( selectTag, { data: { name: 'All Notes' } } );
export const selectTrashedNotes = partial( selectTag, { data: { name: 'Trash' } } );
