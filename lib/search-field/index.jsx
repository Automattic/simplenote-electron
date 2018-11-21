import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

const { search, setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;

export class SearchField extends Component {
  static displayName = 'SearchField';

  static propTypes = {
    placeholder: PropTypes.string.isRequired,
    query: PropTypes.string.isRequired,
    searchFocus: PropTypes.bool.isRequired,
    onSearch: PropTypes.func.isRequired,
    onSearchFocused: PropTypes.func.isRequired,
  };

  componentDidUpdate() {
    const { searchFocus, onSearchFocused } = this.props;

    if (searchFocus && this.inputField) {
      this.inputField.select();
      this.inputField.focus();
      onSearchFocused();
    }
  }

  interceptEsc = ({ keyCode }) =>
    KEY_ESC === keyCode ? this.clearQuery() : null;

  storeInput = r => (this.inputField = r);

  update = ({ target: { value: query } }) => this.props.onSearch(query);

  clearQuery = () => this.props.onSearch('');

  render() {
    const { placeholder, query } = this.props;
    const hasQuery = query && query.length > 0;

    return (
      <div className="search-field">
        <input
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
  query: state.filter,
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
