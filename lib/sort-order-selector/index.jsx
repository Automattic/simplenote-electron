import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import appState from '../flux/app-state';
import { toggleSortOrder, setSortType } from '../state/settings/actions';
import classNames from 'classnames';
import ArrowDownIcon from '../icons/arrow-down';

export class SortOrderSelector extends Component {
  static displayName = 'SortOrderSelector';

  static propTypes = {
    sortType: PropTypes.string.isRequired,
    sortReversed: PropTypes.bool.isRequired,
    toggleSortOrder: PropTypes.func.isRequired,
    setSortType: PropTypes.func.isRequired,
  };

  changeSort = event => {
    this.props.setSortType(event.currentTarget.value);
  };

  render() {
    const { sortType, sortReversed } = this.props;

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
      <div className="sort-order-selector">
        <div
          className={classNames('sort-order-reverse', {
            'is-reversed': sortReversed,
          })}
          onClick={this.props.toggleSortOrder}
        >
          <ArrowDownIcon />
        </div>
        Sort by
        <select value={sortType} onChange={this.changeSort}>
          {sortTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
}

const mapStateToProps = ({ settings }) => ({
  sortType: settings.sortType,
  sortReversed: settings.sortReversed,
});

function mapDispatchToProps(dispatch, { noteBucket }) {
  const actionCreators = Object.assign({}, appState.actionCreators);

  const thenReloadNotes = action => a => {
    dispatch(action(a));
    dispatch(actionCreators.loadNotes({ noteBucket }));
  };
  return {
    setSortType: thenReloadNotes(setSortType),
    toggleSortOrder: thenReloadNotes(toggleSortOrder),
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SortOrderSelector);
