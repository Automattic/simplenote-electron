import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { debounce, isEmpty } from 'lodash';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

const { search, setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;
const SEARCH_DELAY = 500;

export class SearchField extends Component {
  static displayName = 'SearchField';

  static propTypes = {
    filter: PropTypes.string,
    isTagSelected: PropTypes.bool.isRequired,
    placeholder: PropTypes.string.isRequired,
    searchFocus: PropTypes.bool.isRequired,
    onSearch: PropTypes.func.isRequired,
    onSearchFocused: PropTypes.func.isRequired,
  };

  state = {
    query: '',
  };

  componentDidUpdate() {
    const { searchFocus, onSearchFocused, filter } = this.props;

    if (searchFocus && this.inputField) {
      this.inputField.select();
      this.inputField.focus();
      onSearchFocused();
    }

    // check to see if the filter has been updated (by a tag being clicked from suggestions)
    // this is a hack to work around query not being in app state (yet)
    if (filter !== this.state.query) {
      this.inputField.value = filter;
    }
  }

  interceptEsc = event => {
    if (KEY_ESC === event.keyCode) {
      if (this.state.query === '') {
        this.inputField.blur();
      }
      this.clearQuery();
    }
  };

  storeInput = r => (this.inputField = r);

  debouncedSearch = debounce(query => this.props.onSearch(query), SEARCH_DELAY);

  update = ({ target: { value: query } }) => {
    this.setState({ query });
    this.debouncedSearch(query);
  };

  clearQuery = () => {
    this.setState({ query: '' });
    this.debouncedSearch('');
    this.debouncedSearch.flush();
  };

  render() {
    const { isTagSelected, placeholder } = this.props;
    const { query } = this.state;
    const hasQuery = query && query.length > 0;

    const screenReaderLabel =
      'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-field">
        <input
          aria-label={screenReaderLabel}
          ref={this.storeInput}
          type="text"
          placeholder={placeholder}
          onChange={this.update}
          onKeyUp={this.interceptEsc}
          value={query}
          spellCheck={false}
        />
        <button
          aria-label="Clear search"
          hidden={!hasQuery}
          onClick={this.clearQuery}
        >
          <SmallCrossIcon />
        </button>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  filter: state.filter,
  isTagSelected: !isEmpty(state.tag),
  placeholder: state.listTitle,
  searchFocus: state.searchFocus,
});

const mapDispatchToProps = dispatch => ({
  onSearch: filter => {
    dispatch(search({ filter }));
    recordEvent('list_notes_searched');
  },
  onSearchFocused: () => dispatch(setSearchFocus({ searchFocus: false })),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
