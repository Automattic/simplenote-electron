import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setSortType, toggleSortOrder } from '../state/settings/actions';
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

const mapDispatchToProps = {
  setSortType,
  toggleSortOrder,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SortOrderSelector);
