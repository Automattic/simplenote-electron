import React, { Component, createRef, Fragment, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import { State } from '../state';
import { search } from '../state/ui/actions';
import SearchSuggestions from '../search-suggestions';

import { registerSearchField } from '../state/ui/search-field-middleware';

import type * as S from '../state';
import type * as T from '../types';

const KEY_ESC = 27;
const KEY_ENTER = 13;
const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;

type StateProps = {
  openedTag: T.Tag | null;
  searchQuery: string;
  searchSelected: false;
  showTrash: boolean;
};

type DispatchProps = {
  onSearch: (query: string) => any;
};

type Props = StateProps & DispatchProps;

export class SearchField extends Component<Props> {
  static displayName = 'SearchField';

  inputField = createRef<HTMLInputElement>();

  componentDidMount() {
    registerSearchField(this.focus);
  }

  blur = () => {
    if (!this.inputField.current) {
      return;
    }

    this.inputField.current.blur();
  };

  focus = (operation = 'focus-only') => {
    if (!this.inputField.current) {
      return;
    }

    if ('select' === operation) {
      this.inputField.current.select();
    }
    this.inputField.current.focus();
  };

  doSearch = (query: string) => {
    this.setState({ query, searchSelected: true });
    this.onSearch(query);
  };

  // interceptKeys = event => {
  //   switch (event.keyCode) {
  //     case KEY_ESC:
  //       if (this.state.query === '') {
  //         this.inputField.blur();
  //       }
  //       return this.clearQuery();

  //     case KEY_ENTER:
  //       return this.keyHandler.select();

  //     case KEY_ARROW_DOWN:
  //       return this.keyHandler.next();

  //     case KEY_ARROW_UP:
  //       return this.keyHandler.prev();
  //   }
  // };

  update = ({
    currentTarget: { value: query },
  }: FormEvent<HTMLInputElement>) => {
    this.props.onSearch(query);
    this.setState({ query: encodeURIComponent(query), searchSelected: false });
  };

  clearQuery = () => this.props.onSearch('');

  render() {
    const { openedTag, searchQuery, searchSelected, showTrash } = this.props;
    const hasQuery = searchQuery.length > 0;
    const placeholder = showTrash ? 'Trash' : openedTag?.name ?? 'All Notes';
    const shouldShowSuggestions = hasQuery && !searchSelected;

    const screenReaderLabel =
      'Search ' + (openedTag ? 'notes with tag ' : '') + placeholder;

    return (
      <Fragment>
        <div className="search-field">
          <input
            aria-label={screenReaderLabel}
            ref={this.inputField}
            type="search"
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
        {shouldShowSuggestions && (
          <SearchSuggestions
            query={searchQuery}
            onSearch={this.doSearch}
            // storeKeyHandler={this.storeKeyHandler}
          />
        )}
      </Fragment>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { openedTag, searchQuery, showTrash },
}: State) => ({
  openedTag: openedTag ? data.tags.get(openedTag) ?? null : null,
  searchQuery,
  showTrash,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onSearch: (query: string) => {
    dispatch(search(query));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
