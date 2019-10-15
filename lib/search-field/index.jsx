import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { isEmpty } from 'lodash';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import SearchSuggestions from '../search-suggestions';

const { search, setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;
const KEY_ENTER = 13;

export class SearchField extends Component {
  static displayName = 'SearchField';

  static propTypes = {
    isTagSelected: PropTypes.bool.isRequired,
    placeholder: PropTypes.string.isRequired,
    searchFocus: PropTypes.bool.isRequired,
    onSearch: PropTypes.func.isRequired,
    onSearchFocused: PropTypes.func.isRequired,
  };

  state = {
    query: '',
    searchSelected: false,
  };

  componentDidUpdate() {
    const { searchFocus, onSearchFocused } = this.props;

    if (searchFocus && this.inputField) {
      this.inputField.select();
      this.inputField.focus();
      onSearchFocused();
    }
  }

  doSearch = query => {
    this.setState({ query, searchSelected: true });
    this.props.onSearch(query);
  };

  interceptEsc = event => {
    if (KEY_ESC === event.keyCode) {
      if (this.state.query === '') {
        this.inputField.blur();
      }
      this.clearQuery();
    }
    if (KEY_ENTER === event.keyCode) {
      this.doSearch(this.state.query);
    }
  };

  storeInput = r => (this.inputField = r);

  update = ({ target: { value: query } }) => {
    this.setState({ query, searchSelected: false });
  };

  clearQuery = () => {
    this.setState({ query: '', searchSelected: false });
    this.props.onSearch('');
  };

  render() {
    const { isTagSelected, placeholder } = this.props;
    const { query, searchSelected } = this.state;
    const hasQuery = query && query.length > 0;
    const shouldShowSuggestions = hasQuery && !searchSelected;

    const screenReaderLabel =
      'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <Fragment>
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
          {shouldShowSuggestions && (
            <SearchSuggestions query={query} onSearch={this.doSearch} />
          )}
        </div>
      </Fragment>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
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

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchField);
