import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { search } from '../state/ui/actions';
import { tagHashOf } from '../utils/tag-hash';

import type * as S from '../state';
import type * as T from '../types';

type StateProps = {
  filteredTags: T.TagHash[];
  searchQuery: string;
  tags: Map<T.TagHash, T.Tag>;
};

type DispatchProps = {
  onSearch: (query: string) => any;
};

type Props = StateProps & DispatchProps;

export class TagSuggestions extends Component<Props> {
  static displayName = 'TagSuggestions';

  updateSearch = (nextSearch: string) => {
    const { searchQuery, onSearch } = this.props;

    // replace last word in current searchQuery with requested tag match
    const newQuery = searchQuery.trim().split(' ');
    newQuery.splice(-1, 1, nextSearch);
    let querystring = newQuery.join(' ');

    // add a space at the end so the user can immediately start typing
    querystring += ' ';
    onSearch(querystring);
  };

  render() {
    const { filteredTags, tags } = this.props;

    return (
      <Fragment>
        {filteredTags.length > 0 && (
          <div className="tag-suggestions">
            <div className="note-list-header">Search by Tag</div>
            <ul className="tag-suggestions-list theme-color-border">
              {filteredTags.map((tagId) => {
                const tagName =
                  tagId === 'untagged' ? 'untagged' : tags.get(tagId)!.name;
                return (
                  <li
                    key={tagId}
                    id={tagId}
                    className="tag-suggestion-row"
                    onClick={() => this.updateSearch(`tag:${tagName}`)}
                  >
                    <div className="tag-suggestion" title={tagName}>
                      tag:{tagName}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Fragment>
    );
  }
}

export const filterTags = (
  tags: Map<T.TagHash, T.Tag>,
  noteTags: Map<T.TagHash, Set<T.EntityId>>,
  query: string
): T.TagHash[] => {
  // we'll only suggest matches for the last word
  // ...this is possibly naive if the user has moved back and is editing,
  // but without knowing where the cursor is it's maybe the best we can do
  const tagTerm = query.trim().split(' ').pop();

  if (!tagTerm) {
    return [];
  }

  // with `tag:` we don't want to suggest tags which have already been added
  // to the search bar, so we make it an explicit prefix match, meaning we
  // don't match inside the tag and we don't match full-text matches
  const term = tagHashOf(tagTerm as T.TagName);
  const prefixTerm =
    tagTerm.startsWith('tag:') && tagTerm.length > 4
      ? tagHashOf(tagTerm.slice(4) as T.TagName)
      : null;

  const matcher = (tagHash: T.TagHash): boolean => {
    if (
      prefixTerm &&
      tagHash !== prefixTerm &&
      tagHash.startsWith(prefixTerm)
    ) {
      return true;
    }

    return tagHash.includes(term);
  };

  const filteredTags = [];
  for (const tagHash of tags.keys()) {
    if (matcher(tagHash)) {
      filteredTags.push(tagHash);
    }
  }

  if (!query.includes('tag:')) {
    if (matcher(tagHashOf('untagged' as T.TagName))) {
      filteredTags.push(tagHashOf('untagged' as T.TagName));
    }
  }

  return filteredTags
    .sort((a, b) => {
      const aStarts = a.startsWith(term);
      const bStarts = b.startsWith(term);

      if (aStarts !== bStarts) {
        return aStarts ? -1 : 1;
      }

      const aCount = noteTags.get(a)?.size ?? 0;
      const bCount = noteTags.get(b)?.size ?? 0;

      if (aCount !== bCount) {
        return bCount - aCount;
      }

      return a.localeCompare(b);
    })
    .slice(0, 5);
};

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { searchQuery, tagSuggestions },
}) => ({
  filteredTags: tagSuggestions,
  searchQuery,
  tags: data.tags,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onSearch: (query) => {
    dispatch(search(query));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TagSuggestions);
