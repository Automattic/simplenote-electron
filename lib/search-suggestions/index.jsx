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
    filteredTags: PropTypes.array.isRequired,
    storeKeyHandler: PropTypes.func.isRequired,
  };

  state = {
    selectedItem: 0,
  };

  componentDidMount() {
    this.props.storeKeyHandler({
      next: this.nextItem,
      prev: this.prevItem,
      select: this.selectItem,
    });
  }

  componentDidUpdate() {
    this.props.storeKeyHandler({
      next: this.nextItem,
      prev: this.prevItem,
      select: this.selectItem,
    });
  }

  nextItem = () => {
    const { filteredTags } = this.props;
    const { selectedItem } = this.state;
    const newItem =
      selectedItem === filteredTags.length
        ? filteredTags.length
        : selectedItem + 1;
    this.setState({ selectedItem: newItem });
  };

  prevItem = () => {
    const { selectedItem } = this.state;
    const newItem = selectedItem === 0 ? 0 : selectedItem - 1;
    this.setState({ selectedItem: newItem });
  };

  selectItem = () => {
    const { selectedItem } = this.state;
    const { query, onSearch, filteredTags } = this.props;
    if (selectedItem === 0) {
      onSearch(query);
    } else {
      onSearch(`tag:${filteredTags[selectedItem - 1].id}`);
    }
  };

  render() {
    const { query, onSearch, filteredTags } = this.props;
    const { selectedItem } = this.state;
    const screenReaderLabel = 'Search suggestions';
    const shouldShowTagSuggestions = query.length > 2;

    return (
      <div className="search-suggestions" aria-label={screenReaderLabel}>
        <div
          id="query"
          className={
            selectedItem === 0
              ? 'search-suggestion-row search-suggestion-row-selected'
              : 'search-suggestion-row'
          }
          onClick={() => onSearch(query)}
        >
          <SmallSearchIcon />
          <div className="search-suggestion">{query}</div>
        </div>
        {shouldShowTagSuggestions &&
          filteredTags.map((tag, index) => (
            <div
              key={tag.id}
              id={tag.id}
              className={
                selectedItem === index + 1
                  ? 'search-suggestion-row search-suggestion-row-selected'
                  : 'search-suggestion-row'
              }
              onClick={() => onSearch(`tag:${tag.id}`)}
            >
              <TagIcon />
              <div className="search-suggestion">
                {decodeURIComponent(tag.id)}
              </div>
            </div>
          ))}
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }, ownProps) => ({
  filteredTags: state.tags.filter(function(tag) {
    return tag.id.startsWith(encodeURIComponent(ownProps.query));
  }),
});

export default connect(
  mapStateToProps,
  null
)(SearchSuggestions);
