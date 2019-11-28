import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import {
  toggleSearchSortOrder,
  setSearchSortType,
} from '../state/settings/actions';
import classNames from 'classnames';
import ArrowDownIcon from '../icons/arrow-down';

export class SortOrderSelector extends Component {
  static displayName = 'SortOrderSelector';

  static propTypes = {
    query: PropTypes.string.isRequired,
    sortType: PropTypes.string.isRequired,
    sortReversed: PropTypes.bool.isRequired,
    searchSortType: PropTypes.string.isRequired,
    searchSortReversed: PropTypes.bool.isRequired,
    toggleSortOrder: PropTypes.func.isRequired,
    setSortType: PropTypes.func.isRequired,
  };

  changeSort = event => {
    this.props.setSortType(event.currentTarget.value);
  };

  render() {
    const { searchSortType, searchSortReversed, query } = this.props;

    const sortTypes = [
      {
        label: 'Date modified',
        id: 'modificationDate',
      },
      {
        label: 'Date created',
        id: 'creationDate',
      },
      {
        label: 'Alphabetical',
        id: 'alphabetical',
      },
    ];

    return (
      <Fragment>
        {query.length > 0 && (
          <div className="sort-order-selector">
            <div
              className={classNames('sort-order-reverse', {
                'is-reversed': searchSortReversed,
              })}
              onClick={this.props.toggleSortOrder}
            >
              <ArrowDownIcon />
            </div>
            Sort by
            <select value={searchSortType} onChange={this.changeSort}>
              {sortTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </Fragment>
    );
  }
}

const mapStateToProps = ({ settings, appState: state }) => ({
  sortType: settings.sortType,
  sortReversed: settings.sortReversed,
  searchSortType: settings.searchSortType,
  searchSortReversed: settings.searchSortReversed,
  query: state.filter,
});

function mapDispatchToProps(dispatch, { noteBucket }) {
  const actionCreators = Object.assign({}, appState.actionCreators);

  const thenReloadNotes = action => a => {
    dispatch(action(a));
    dispatch(actionCreators.loadNotes({ noteBucket }));
  };
  return {
    setSortType: thenReloadNotes(setSearchSortType),
    toggleSortOrder: thenReloadNotes(toggleSearchSortOrder),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SortOrderSelector);
