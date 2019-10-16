import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SmallSearchIcon from '../icons/search-small';
import TagIcon from '../icons/tag';

export class SearchSuggestions extends Component {
  static displayName = 'SearchSuggestions';

  static propTypes = {
    onSearch: PropTypes.func.isRequired,
    query: PropTypes.string.isRequired,
    tags: PropTypes.array.isRequired,
  };

  render() {
    const { query, onSearch, tags } = this.props;
    // const screenReaderLabel =
    //   'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-suggestions">
        <div className="search-suggestion-row" onClick={() => onSearch(query)}>
          <SmallSearchIcon />
          {query}
        </div>
        {tags
          .filter(function(tag) {
            return tag.id.includes(query);
          })
          .map(tag => (
            <div
              key={tag.id}
              className="search-suggestion-row"
              onClick={() => onSearch(`tag:${tag.id}`)}
            >
              <TagIcon />
              {tag.id}
            </div>
          ))}
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  tags: state.tags,
});

export default connect(
  mapStateToProps,
  null
)(SearchSuggestions);
