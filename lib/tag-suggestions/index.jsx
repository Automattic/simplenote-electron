import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

const { search } = appState.actionCreators;
const { recordEvent } = tracks;

export class TagSuggestions extends Component {
  static displayName = 'TagSuggestions';

  static propTypes = {
    filteredTags: PropTypes.array.isRequired,
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
                  onClick={() => this.props.onSearch(`tag:${tag.data.name}`)}
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

const filterTags = (tags, query) =>
  query
    ? tags
        .filter(tag => {
          // split on spaces and treat each "word" as a separate query
          let queryWords = query.trim().split(' ');

          // we'll only suggest matches for the last word
          // ...this is possibly naive if the user has moved back and is editing,
          // but without knowing where the cursor is it's maybe the best we can do
          let testQuery = queryWords[queryWords.length - 1];

          // prefix tag ID with "tag:"; this allows us to match if the user typed the prefix
          // n.b. doing it in this direction instead of stripping off any "tag:" prefix allows support
          // of tags that contain the string "tag:" ¯\_(ツ)_/¯
          let testID = 'tag:' + tag.data.name;

          // exception: if the user typed "tag:" or some subset thereof, don't return all tags
          if (['t', 'ta', 'tag', 'tag:'].includes(testQuery)) {
            testID = tag.data.name;
          }

          return (
            testID.search(new RegExp('(tag:)?' + testQuery, 'i')) !== -1 &&
            // discard exact matches -- if the user has already typed or clicked
            // the full tag name, don't suggest it
            !queryWords.includes(testID)
          );
        })
        .slice(0, 5)
    : tags; // don't bother filtering if we don't have a query to filter by

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

const mapStateToProps = ({ appState: state }) => ({
  filteredTags: getMatchingTags(state.tags, state.filter),
});

const mapDispatchToProps = dispatch => ({
  onSearch: filter => {
    dispatch(search({ filter }));
    recordEvent('list_notes_searched');
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TagSuggestions);
