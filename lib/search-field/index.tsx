import React, { Component, createRef, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import SmallSearchIcon from '../icons/search-small';
import { State } from '../state';
import * as selectors from '../state/selectors';
import { focusSearchField, search } from '../state/ui/actions';

import { registerSearchField } from '../state/ui/search-field-middleware';

import type * as S from '../state';
import type * as T from '../types';

const KEY_ESC = 27;

type StateProps = {
  openedTag: T.TagName | null;
  searchQuery: string;
};

type DispatchProps = {
  focusSearchField: () => any;
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

  interceptEsc = (event: KeyboardEvent) => {
    if (KEY_ESC === event.keyCode) {
      if (this.props.searchQuery === '') {
        this.blur();
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
    const { openedTag, searchQuery } = this.props;
    const hasQuery = searchQuery.length > 0;

    const description =
      'Search ' +
      (openedTag ? 'notes with tag ' + openedTag : 'notes and tags');

    return (
      <div className="search-field theme-color-fg theme-color-border">
        <button
          aria-label="Focus search field"
          onClick={this.props.focusSearchField}
          className="icon-button"
        >
          <SmallSearchIcon />
        </button>
        <input
          ref={this.inputField}
          type="search"
          placeholder={description}
          onChange={this.update}
          onKeyUp={this.interceptEsc}
          value={searchQuery}
          spellCheck={false}
        />
        <button
          aria-label="Clear search"
          className="icon-button"
          hidden={!hasQuery}
          onClick={this.clearQuery}
        >
          <SmallCrossIcon />
        </button>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state: State) => ({
  openedTag: selectors.openedTag(state),
  searchQuery: state.ui.searchQuery,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  focusSearchField: () => dispatch(focusSearchField()),
  onSearch: (query: string) => {
    dispatch(search(query));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
