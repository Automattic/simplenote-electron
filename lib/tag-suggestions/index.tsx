import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import analytics from '../analytics';
import { search } from '../state/ui/actions';
import filterAtMost from '../utils/filter-at-most';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  filteredTags: T.EntityId[];
  searchQuery: string;
  tags: Map<T.EntityId, T.Tag>;
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
    let newQuery = searchQuery.trim().split(' ');
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
            <ul className="tag-suggestions-list">
              {filteredTags.map((tagId) => (
                <li
                  key={tagId}
                  id={tagId}
                  className="tag-suggestion-row"
                  onClick={() =>
                    this.updateSearch(`tag:${tags.get(tagId)!.name}`)
                  }
                >
                  <div className="tag-suggestion" title={tags.get(tagId)!.name}>
                    tag:{tags.get(tagId)!.name}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Fragment>
    );
  }
}

export const filterTags = (tags: Map<T.EntityId, T.Tag>, query: string) => {
  // we'll only suggest matches for the last word
  // ...this is possibly naive if the user has moved back and is editing,
  // but without knowing where the cursor is it's maybe the best we can do
  const tagTerm = query.trim().toLowerCase().split(' ').pop();

  if (!tagTerm) {
    return [];
  }

  // with `tag:` we don't want to suggest tags which have already been added
  // to the search bar, so we make it an explicit prefix match, meaning we
  // don't match inside the tag and we don't match full-text matches
  const isPrefixMatch = tagTerm.startsWith('tag:') && tagTerm.length > 4;
  const term = isPrefixMatch ? tagTerm.slice(4) : tagTerm;

  const matcher: (tag: T.Tag) => boolean = isPrefixMatch
    ? ({ name }) =>
        name.toLowerCase() !== term && name.toLowerCase().startsWith(term)
    : ({ name }) => name.toLowerCase().includes(term);

  const filteredTags = [];
  for (const [tagId, tag] of tags.entries()) {
    if (matcher(tag)) {
      filteredTags.push(tagId);
    }

    if (filteredTags.length >= 5) {
      return filteredTags;
    }
  }
  return filteredTags;
};

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { searchQuery, tagSuggestions },
}) => ({
  filteredTags: tagSuggestions,
  searchQuery,
  tags: data.tags[0],
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onSearch: (query) => {
    dispatch(search(query));
    analytics.tracks.recordEvent('list_notes_searched');
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TagSuggestions);
