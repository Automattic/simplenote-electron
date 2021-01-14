import React, { Component, createRef, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import SmallSearchIcon from '../icons/search-small';
import { State } from '../state';
import { focusSearchField, search } from '../state/ui/actions';

import { registerSearchField } from '../state/ui/search-field-middleware';

import type * as S from '../state';
import type * as T from '../types';

const KEY_ESC = 27;

type StateProps = {
  openedTag: T.Tag | null;
  searchQuery: string;
  showTrash: boolean;
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
    const placeholder = openedTag?.name ?? 'Search notes and tags';

    const screenReaderLabel =
      'Search ' + (openedTag ? 'notes with tag ' : '') + placeholder;

    return (
      <div className="search-field theme-color-fg-dim theme-color-border">
        <button onClick={this.props.focusSearchField}>
          <SmallSearchIcon />
        </button>
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
  focusSearchField: () => dispatch(focusSearchField()),
  onSearch: (query: string) => {
    dispatch(search(query));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
