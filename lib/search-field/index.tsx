import React, { Component, createRef, FormEvent, KeyboardEvent } from 'react';
import { connect } from 'react-redux';
import SmallCrossIcon from '../icons/cross-small';
import analytics from '../analytics';
import { State } from '../state';
import { search } from '../state/ui/actions';

import { registerSearchField } from '../state/ui/search-field-middleware';

import * as S from '../state';
import * as T from '../types';

const KEY_ESC = 27;

type StateProps = {
  openedTag: T.Tag | null;
  searchQuery: string;
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
    const { openedTag, searchQuery, showTrash } = this.props;
    const hasQuery = searchQuery.length > 0;
    const placeholder = showTrash ? 'Trash' : openedTag?.name ?? 'All Notes';

    const screenReaderLabel =
      'Search ' + (openedTag ? 'notes with tag ' : '') + placeholder;

    return (
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
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { openedTag, searchQuery, showTrash },
}: State) => ({
  openedTag: openedTag ? data.tags[0].get(openedTag) ?? null : null,
  searchQuery,
  showTrash,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onSearch: (query: string) => {
    dispatch(search(query));
    analytics.tracks.recordEvent('list_notes_searched');
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchField);
