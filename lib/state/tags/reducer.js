import {
	constant,
	differenceBy,
	flowRight as compose,
	has,
	partialRight,
	property,
	unionBy,
} from 'lodash';

import {
	AUTH_RESET,
	TAGS_ADD,
	TAGS_REMOVE,
	TAGS_REPLACE,
	TAGS_UPDATE,
} from '../action-types';

const tagId = property( 'id' );

export const addTags = ( state, { tags } ) => unionBy( state, tags, tagId );
export const clearTags = constant( [] );
export const removeTags = ( state, { tags } ) => differenceBy( state, tags, tagId );
export const replaceTags = ( state, { tags } ) => tags;
export const updateTags = ( state, { oldTags, newTags } ) => compose(
	partialRight( addTags, { tags: newTags } ),
	partialRight( removeTags, { tags: oldTags } ),
)( state );

const actionMap = {
	[ AUTH_RESET ]: clearTags,
	[ TAGS_ADD ]: addTags,
	[ TAGS_REMOVE ]: removeTags,
	[ TAGS_REPLACE ]: replaceTags,
	[ TAGS_UPDATE ]: updateTags,
};

export const tagList = ( state = [], action ) =>
	has( actionMap, action.type )
		? actionMap[ action.type ]( state, action )
		: state;

export default tagList;
