import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { State } from '../state';
import { dismissSearchSuggestions, search } from '../state/ui/actions';
import SmallSearchIcon from '../icons/search-small';

import type * as S from '../state';
// import type * as T from '../types';

type StateProps = {
  searchQuery: string;
  searchHistory: string[];
  showSearchHistory: boolean;
  // storeKeyHandler: () => any;
};

type DispatchProps = {
  onSearch: (query: string) => any;
};

type OwnState = {
  selectedItem: number;
};

type Props = StateProps & DispatchProps;

export class SearchSuggestions extends Component<Props, OwnState> {
  static displayName = 'SearchSuggestions';

  state = {
    selectedItem: 0,
  };

  // componentDidMount() {
  //   this.props.storeKeyHandler({
  //     next: this.nextItem,
  //     prev: this.prevItem,
  //     select: this.selectItem,
  //   });
  // }

  // componentDidUpdate() {
  // scroll selected item into view
  // const selectedItem = this.refs.selectedItem;
  // const domNode = null;
  // todo scroll only when needed (i.e. item is not visible)
  // if (selectedItem) {
  // domNode = ReactDOM.findDOMNode(selectedItem);
  // domNode?.scrollIntoView(false);
  // }

  // this.props.storeKeyHandler({
  //   next: this.nextItem,
  //   prev: this.prevItem,
  //   select: this.selectItem,
  // });
  // }

  // nextItem = () => {
  //   const { searchHistory } = this.props;
  //   const { selectedItem } = this.state;
  //   const newItem = Math.min(filteredTags.length, selectedItem + 1);
  //   this.setState({ selectedItem: newItem });
  // };

  // prevItem = () => {
  //   const { selectedItem } = this.state;
  //   const newItem = Math.max(0, selectedItem - 1);
  //   this.setState({ selectedItem: newItem });
  // };

  // selectItem = () => {
  //   const { selectedItem } = this.state;
  //   const { query, onSearch, filteredTags } = this.props;
  //   if (selectedItem === 0) {
  //     onSearch(query);
  //   } else {
  //     onSearch(`tag:${filteredTags[selectedItem - 1].id}`);
  //   }
  // };

  render() {
    const {
      onSearch,
      searchQuery,
      searchHistory,
      showSearchHistory,
    } = this.props;
    // const { selectedItem } = this.state;
    const screenReaderLabel = 'Search suggestions';

    return (
      showSearchHistory && (
        <div className="search-suggestions" aria-label={screenReaderLabel}>
          <ul className="search-suggestions-list">
            <li
              id="query"
              className={
                'search-suggestion-row'
                // selectedItem === 0
                // ? 'search-suggestion-row search-suggestion-row-selected'
                // : 'search-suggestion-row'
              }
              onClick={() => onSearch(searchQuery)}
            >
              <SmallSearchIcon />
              <span className="search-suggestion">
                {decodeURIComponent(searchQuery)}
              </span>
            </li>
            {searchHistory.length > 0 &&
              searchHistory.map((query, index) => (
                <li
                  key={query}
                  id={query}
                  className={
                    'search-suggestion-row'
                    // selectedItem === index + 1
                    // ? 'search-suggestion-row search-suggestion-row-selected'
                    // : 'search-suggestion-row'
                  }
                  onClick={() => onSearch(query)}
                  // ref={selectedItem === index + 1 ? 'selectedItem' : ''}
                >
                  <span className="search-suggestion">
                    {decodeURIComponent(query)}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { searchQuery, showSearchHistory },
}: State) => ({
  searchQuery,
  searchHistory: ['test', 'meow'],
  showSearchHistory,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  onSearch: (query: string) => {
    dispatch(search(query));
    dispatch(dismissSearchSuggestions());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(SearchSuggestions);
