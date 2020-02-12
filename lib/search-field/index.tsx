import React, { Component, createRef, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import { State } from '../state';

const { search, setSearchFocus } = appState.actionCreators;
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
      if (this.props.filter === '' && this.inputField.current) {
        this.inputField.current.blur();
      }
      this.clearQuery();
    }
  };

  update = ({
    currentTarget: { value: filter },
  }: FormEvent<HTMLInputElement>) => {
    this.props.onSearch(filter);
  };

  clearQuery = () => this.props.onSearch('');

  render() {
    const { filter, isTagSelected, placeholder } = this.props;
    const hasQuery = filter.length > 0;

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
          value={filter}
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

const mapStateToProps = ({ appState: state, ui: { listTitle } }: State) => ({
  filter: state.filter,
  isTagSelected: !!state.tag,
  placeholder: listTitle,
  searchFocus: state.searchFocus,
});

const mapDispatchToProps = dispatch => ({
  onSearch: (filter: string) => {
    dispatch(search({ filter }));
    recordEvent('list_notes_searched');
  },
  onSearchFocused: () => dispatch(setSearchFocus({ searchFocus: false })),
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
