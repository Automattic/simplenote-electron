import React, { Component, createRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { isEmpty } from 'lodash';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import actions from '../state/actions';

const { setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;

export class SearchField extends Component {
  static displayName = 'SearchField';

  static propTypes = {
    isTagSelected: PropTypes.bool.isRequired,
    placeholder: PropTypes.string.isRequired,
    searchFocus: PropTypes.bool.isRequired,
    onSearchFocused: PropTypes.func.isRequired,
  };

  constructor(...args) {
    super(...args);

    this.inputField = createRef();
  }

  componentDidUpdate() {
    const { searchFocus, onSearchFocused } = this.props;

    if (searchFocus && this.inputField.current) {
      this.inputField.current.select();
      this.inputField.current.focus();
      onSearchFocused();
    }
  }

  interceptEsc = event => {
    if (KEY_ESC === event.keyCode) {
      if (this.props.searchQuery === '') {
        this.inputField.blur();
      }
      this.props.resetSearch();
    }
  };

  resetSearch = () => {
    this.props.resetSearch();
    this.inputField.current.select();
    this.inputField.current.focus();
  };

  searchNotes = ({ target: { value } }) => this.props.searchNotes(value);

  render() {
    const { isTagSelected, placeholder, searchQuery } = this.props;
    const hasQuery = searchQuery && searchQuery.length > 0;

    const screenReaderLabel =
      'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-field">
        <input
          aria-label={screenReaderLabel}
          ref={this.inputField}
          type="text"
          placeholder={placeholder}
          onChange={this.searchNotes}
          onKeyUp={this.interceptEsc}
          value={searchQuery}
          spellCheck={false}
        />
        <button
          aria-label="Clear search"
          hidden={!hasQuery}
          onClick={this.resetSearch}
        >
          <SmallCrossIcon />
        </button>
      </div>
    );
  }
}

const mapStateToProps = ({
  appState: { listTitle, searchFocus, tag },
  search: { searchQuery },
}) => {
  return {
    searchQuery,
    isTagSelected: !isEmpty(tag),
    placeholder: listTitle,
    searchFocus: searchFocus,
  };
};

const mapDispatchToProps = dispatch => ({
  resetSearch: () => dispatch(actions.search.resetSearch()),
  searchNotes: query => {
    dispatch(actions.search.searchNotes(query, { debounce: true }));
    recordEvent('list_notes_searched');
  },
  onSearchFocused: () => dispatch(setSearchFocus({ searchFocus: false })),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SearchField);
