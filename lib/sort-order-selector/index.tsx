import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { toggleSortOrder, setSortType } from '../state/settings/actions';
import IconButton from '../icon-button';
import SortOrderIcon from '../icons/sort-order';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  shouldDisplay: boolean;
  sortReversed: boolean;
  sortType: T.SortType;
};

type DispatchProps = {
  setSortType: (sortType: T.SortType) => any;
  toggleSortOrder: () => any;
};

type Props = StateProps & DispatchProps;

export const SortOrderSelector: FunctionComponent<Props> = ({
  shouldDisplay,
  setSortType,
  sortReversed,
  sortType,
  toggleSortOrder,
}) => {
  const changeSort = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const [
      selectedSortType,
      selectedSortReversed,
    ] = event.currentTarget.value.split(' ');
    setSortType(selectedSortType);
    if ((selectedSortReversed === 'false') === sortReversed) {
      toggleSortOrder();
    }
  };

  const sortTypes = [
    {
      label: 'Name: A-Z',
      id: 'alphabetical false',
    },
    {
      label: 'Name: Z-A',
      id: 'alphabetical true',
    },
    {
      label: 'Created: Newest',
      id: 'creationDate false',
    },
    {
      label: 'Created: Oldest',
      id: 'creationDate true',
    },
    {
      label: 'Modified: Newest',
      id: 'modificationDate false',
    },
    {
      label: 'Modified: Oldest',
      id: 'modificationDate true',
    },
  ];

  return (
    <Fragment>
      {shouldDisplay && (
        <div className="sort-order-selector theme-color-fg-dim">
          <label htmlFor="sort-selection">Sort by</label>
          <select
            id="sort-selection"
            value={sortType + ' ' + sortReversed.toString()}
            onChange={changeSort}
          >
            {sortTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </Fragment>
  );
};

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
