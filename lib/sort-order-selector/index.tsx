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
    setSortType(event.currentTarget?.value);
  };

  let sortLabel = sortReversed ? 'Oldest' : 'Newest';
  if (sortType === 'alphabetical') {
    sortLabel = sortReversed ? 'Z-A' : 'A-Z';
  }

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
          <label htmlFor="sort-selection">Sort:</label>
          <select id="sort-selection" value={sortType} onChange={changeSort}>
            {sortTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
          <span className="sort-label">{sortLabel}</span>
          <span className="sort-button">
            <IconButton
              icon={<SortOrderIcon />}
              onClick={toggleSortOrder}
              title="Change Sort Order"
            />
          </span>
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
