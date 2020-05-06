import * as A from '../action-types';
import * as T from '../../types';

export const tagsLoaded: A.ActionCreator<A.TagsLoaded> = (
  tags: T.TagEntity[],
  sortTagsAlpha: boolean
) => ({
  type: 'TAGS_LOADED',
  tags,
  sortTagsAlpha,
});
