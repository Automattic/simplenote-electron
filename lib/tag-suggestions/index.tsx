import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import { search, setSearchFocus } from '../state/ui/actions';
import filterAtMost from '../utils/filter-at-most';

import * as S from '../state';
import * as T from '../types';

const { recordEvent } = tracks;

type StateProps = {
  filteredTags: T.TagEntity[];
  searchQuery: string;
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
    const { filteredTags } = this.props;

    return (
      <Fragment>
        {filteredTags.length > 0 && (
          <div className="tag-suggestions">
            <div className="note-list-header">Search by Tag</div>
            <ul className="tag-suggestions-list">
              {filteredTags.map(tag => (
                <li
                  key={tag.id}
                  id={tag.id}
                  className="tag-suggestion-row"
                  onClick={() => this.updateSearch(`tag:${tag.data.name}`)}
                >
                  <div className="tag-suggestion" title={tag.data.name}>
                    tag:{tag.data.name}
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

export const filterTags = (tags: T.TagEntity[], query: string) => {
  // we'll only suggest matches for the last word
  // ...this is possibly naive if the user has moved back and is editing,
  // but without knowing where the cursor is it's maybe the best we can do
  const tagTerm = query
    .trim()
    .toLowerCase()
    .split(' ')
    .pop();

  if (!tagTerm) {
    return tags;
  }

  // with `tag:` we don't want to suggest tags which have already been added
  // to the search bar, so we make it an explicit prefix match, meaning we
  // don't match inside the tag and we don't match full-text matches
  const isPrefixMatch = tagTerm.startsWith('tag:') && tagTerm.length > 4;
  const term = isPrefixMatch ? tagTerm.slice(4) : tagTerm;

  const matcher: (tag: T.TagEntity) => boolean = isPrefixMatch
    ? ({ data: { name } }) =>
        name.toLowerCase() !== term && name.toLowerCase().startsWith(term)
    : ({ data: { name } }) => name.toLowerCase().includes(term);

  return filterAtMost(tags, matcher, 5);
};

let lastTags = null;
let lastQuery = null;
let lastMatches = [];
export const getMatchingTags = (tags, query) => {
  if (lastTags === tags && lastQuery === query) {
    return lastMatches;
  }

  lastTags = tags;
  lastQuery = query;
  lastMatches = filterTags(tags, query);
  return lastMatches;
};

const mapStateToProps: S.MapState<StateProps> = ({
  appState: state,
  ui: { searchQuery },
}) => ({
  filteredTags: getMatchingTags(state.tags, searchQuery),
  searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = dispatch => ({
  onSearch: query => {
    dispatch(search(query));
    recordEvent('list_notes_searched');
    dispatch(setSearchFocus());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TagSuggestions);
