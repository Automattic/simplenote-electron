import {
	TAGS_ADD,
	TAGS_REMOVE,
	TAGS_REPLACE,
	TAGS_UPDATE,
} from '../action-types';

export const addTags = tags => ( {
	type: TAGS_ADD,
	tags,
} );

export const addTag = tag => addTags( [ tag ] );

export const removeTags = tags => ( {
	type: TAGS_REMOVE,
	tags,
} );

export const removeTag = tag => removeTags( [ tag ] );

export const replaceTags = tags => ( {
	type: TAGS_REPLACE,
	tags,
} );

export const updateTags = ( oldTags, newTags ) => ( {
	type: TAGS_UPDATE,
	oldTags,
	newTags,
} );

export const updateTag = ( oldTag, newTag ) =>
	updateTags( [ oldTag ], [ newTag ] );
