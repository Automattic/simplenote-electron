import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SmallSearchIcon from '../icons/search-small';

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
    // scroll selected item into view
    var selectedItem = this.refs.selectedItem;
    var domNode = null;
    // todo scroll only when needed (i.e. item is not visible)
    if (selectedItem) {
      domNode = ReactDOM.findDOMNode(selectedItem);
      domNode.scrollIntoView(false);
    }


    this.props.storeKeyHandler({
      next: this.nextItem,
      prev: this.prevItem,
      select: this.selectItem,
    });
  }

  nextItem = () => {
    const { filteredTags } = this.props;
    const { selectedItem } = this.state;
    const newItem = Math.min(filteredTags.length, selectedItem + 1);
    this.setState({ selectedItem: newItem });
  };

  prevItem = () => {
    const { selectedItem } = this.state;
    const newItem = Math.max(0, selectedItem - 1);
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
    const shouldShowTagSuggestions = query.length > 1;

    return (
      <div className="search-suggestions" aria-label={screenReaderLabel}>
        <ul className="search-suggestions-list">
          <li
            id="query"
            className={
              selectedItem === 0
                ? 'search-suggestion-row search-suggestion-row-selected'
                : 'search-suggestion-row'
            }
            onClick={() => onSearch(query)}
          >
            <SmallSearchIcon />
            <span className="search-suggestion">
              {decodeURIComponent(query)}
            </span>
          </li>
          {shouldShowTagSuggestions &&
            filteredTags.map((tag, index) => (
              <li
                key={tag.id}
                id={tag.id}
                className={
                  selectedItem === index + 1
                    ? 'search-suggestion-row search-suggestion-row-selected'
                    : 'search-suggestion-row'
                }
                onClick={() => onSearch(`tag:${tag.id}`)}
                ref={selectedItem === index + 1 ? 'selectedItem' : ''}
              >
                <span className="search-suggestion">
                  {decodeURIComponent(tag.id)}
                </span>
              </li>
            ))}
        </ul>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }, ownProps) => ({
  filteredTags: state.tags.filter(function(tag) {
    return tag.id.search(new RegExp(ownProps.query, 'i')) !== -1;
  }),
});

export default connect(
  mapStateToProps,
  null
)(SearchSuggestions);
