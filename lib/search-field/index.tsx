import React, { Component, createRef, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import { State } from '../state';
import { search } from '../state/ui/actions';

const { setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;
const KEY_ESC = 27;

type ConnectedProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>;

export class SearchField extends Component<ConnectedProps> {
  static displayName = 'SearchField';

  inputField = createRef<HTMLInputElement>();

  componentDidUpdate() {
    const { searchFocus, onSearchFocused } = this.props;

    if (searchFocus && this.inputField.current) {
      this.inputField.current.select();
      this.inputField.current.focus();
      onSearchFocused();
    }
  }

  interceptEsc = (event: KeyboardEvent) => {
    if (KEY_ESC === event.keyCode) {
      if (this.props.searchQuery === '' && this.inputField.current) {
        this.inputField.current.blur();
      }
      this.clearQuery();
    }
  };

  update = ({
    currentTarget: { value: query },
  }: FormEvent<HTMLInputElement>) => {
    this.props.onSearch(query);
  };

  clearQuery = () => this.props.onSearch('');

  render() {
    const { searchQuery, isTagSelected, placeholder } = this.props;
    const hasQuery = searchQuery.length > 0;

    const screenReaderLabel =
      'Search ' + (isTagSelected ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-field">
        <input
          aria-label={screenReaderLabel}
          ref={this.inputField}
          type="text"
          placeholder={placeholder}
          onChange={this.update}
          onKeyUp={this.interceptEsc}
          value={searchQuery}
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

const mapStateToProps = ({ appState: state, ui: { listTitle, searchQuery } }: State) => ({
  isTagSelected: !!state.tag,
  placeholder: listTitle,
  searchFocus: state.searchFocus,
  searchQuery,
});

const mapDispatchToProps = dispatch => ({
  onSearch: (query: string) => {
    dispatch(search(query));
    recordEvent('list_notes_searched');
  },
  onSearchFocused: () => dispatch(setSearchFocus({ searchFocus: false })),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
