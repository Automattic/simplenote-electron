import * as A from '../action-types';
import * as T from '../../types';

const tags: A.Reducer<T.TagEntity[]> = (state = [], action) => {
  switch (action.type) {
    case 'TAGS_LOADED': {
      const sortedTags = action.tags.slice();
      if (action.sortTagsAlpha) {
        // Sort tags alphabetically by 'name' value
        sortedTags.sort((a: T.TagEntity, b: T.TagEntity) => {
          return a?.data?.name
            .toLocaleLowerCase()
            .localeCompare(b.data?.name.toLocaleLowerCase());
        });
      } else {
        // Sort the tags by their 'index' value
        sortedTags.sort(
          (a: T.TagEntity, b: T.TagEntity) =>
            (a.data.index | 0) - (b.data.index | 0)
        );
      }
      return sortedTags;
    }
    default:
      return state;
  }
};

export default tags;
