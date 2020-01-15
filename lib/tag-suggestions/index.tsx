import React, { Component, Fragment } from 'react';
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux';
import appState from '../flux/app-state';
import { tracks } from '../analytics';

import { State } from '../state';
import * as T from '../types';

const { search, setSearchFocus } = appState.actionCreators;
const { recordEvent } = tracks;

type OwnProps = {};

type StateProps = {
  filteredTags: T.TagEntity[];
  query: string;
};

type DispatchProps = {
  onSearch: (filter: string) => void;
};

type Props = StateProps & DispatchProps;

export class TagSuggestions extends Component<Props> {
  static displayName = 'TagSuggestions';

  updateSearch = (filter: string) => {
    const { query, onSearch } = this.props;

    // replace last word in current query with requested tag match
    let newQuery = query.trim().split(' ');
    newQuery.splice(-1, 1, filter);
    let querystring = newQuery.join(' ');

    // add a space at the end so the user can immediately start typing
    querystring += ' ';
    onSearch(querystring);
  };

  render() {
    const { filteredTags } = this.props;

    return (
      <Fragment>
        {filteredTags.length > 0 && (
          <div className="tag-suggestions">
            <div className="note-list-header">Search by Tag</div>
            <ul className="tag-suggestions-list">
              {filteredTags.map(tag => (
                <li
                  key={tag.id}
                  id={tag.id}
                  className="tag-suggestion-row"
                  onClick={() => this.updateSearch(`tag:${tag.data.name}`)}
                >
                  <div className="tag-suggestion" title={tag.data.name}>
                    tag:{tag.data.name}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Fragment>
    );
  }
}

const mapStateToProps: MapStateToProps<
  StateProps,
  OwnProps,
  State
> = state => ({
  filteredTags: state.ui.filteredTags,
  query: state.appState.filter,
});

const mapDispatchToProps: MapDispatchToProps<
  DispatchProps,
  OwnProps
> = dispatch => ({
  onSearch: (filter: string) => {
    dispatch(search({ filter, sync: true }));
    recordEvent('list_notes_searched');
    dispatch(setSearchFocus({ searchFocus: true }));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(TagSuggestions);
