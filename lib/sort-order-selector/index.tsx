import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { toggleSortOrder, setSortType } from '../state/settings/actions';
import classNames from 'classnames';
import SortOrderIcon from '../icons/sort-order';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  shouldDisplay: boolean;
  sortReversed: boolean;
  sortType: T.SortType;
};

type DispatchProps = {
  toggleSortOrder: () => any;
  setSortType: (sortType: T.SortType) => any;
};

type Props = StateProps & DispatchProps;

export class SortOrderSelector extends Component<Props> {
  static displayName = 'SortOrderSelector';

  changeSort = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.props.setSortType(event.currentTarget?.value);
  };

  render() {
    const { shouldDisplay, sortReversed, sortType } = this.props;

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
        {shouldDisplay && (
          <div className="sort-order-selector">
            Sort:
            <select value={sortType} onChange={this.changeSort}>
              {sortTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
            <div
              className={classNames('sort-order-reverse', {
                'is-reversed': sortReversed,
              })}
              onClick={this.props.toggleSortOrder}
            >
              <SortOrderIcon />
            </div>
          </div>
        )}
      </Fragment>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  shouldDisplay: state.ui.filteredNotes.length > 0,
  sortReversed: state.settings.sortReversed,
  sortType: state.settings.sortType,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  setSortType,
  toggleSortOrder,
};

export default connect(mapStateToProps, mapDispatchToProps)(SortOrderSelector);
