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
    setSelectionHandlers: PropTypes.func.isRequired,
  };

  state = {
    selectedItem: 0,
  };

  constructor(props) {
    super(props);

    this.nextItem = this.nextItem.bind(this);
    this.prevItem = this.prevItem.bind(this);
  }

  componentDidMount() {
    this.props.setSelectionHandlers({
      next: this.nextItem,
      prev: this.prevItem,
      select: this.selectItem,
    });
  }

  nextItem() {
    const { query, tags } = this.props;
    const { selectedItem } = this.state;
    const matchedTagsLength = tags.filter(function(tag) {
      return tag.id.startsWith(encodeURIComponent(query));
    }).length;
    const newItem =
      selectedItem === matchedTagsLength ? matchedTagsLength : selectedItem + 1;
    this.setState({ selectedItem: newItem });
  }

  prevItem() {
    const { selectedItem } = this.state;
    const newItem = selectedItem === 0 ? 0 : selectedItem - 1;
    this.setState({ selectedItem: newItem });
  }

  selectItem() {
    console.log('select');
    // return the value of selected item?
    //onClick={() => onSearch(`tag:${tag.id}`)}
  }

  render() {
    const { query, onSearch, tags } = this.props;
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
          tags
            .filter(function(tag) {
              return tag.id.startsWith(encodeURIComponent(query));
            })
            .map((tag, index) => (
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

const mapStateToProps = ({ appState: state }) => ({
  tags: state.tags,
});

export default connect(
  mapStateToProps,
  null
)(SearchSuggestions);
