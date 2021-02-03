import React, { Fragment, FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { toggleSortOrder, setSortType } from '../state/settings/actions';
import { recordEvent } from '../state/analytics/middleware';

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
    const selectedOption = event.currentTarget.selectedOptions[0];
    const selectedSortType = selectedOption.dataset.order;
    const selectedSortReversed = selectedOption.dataset.reversed;

    if (selectedSortType !== sortType) {
      setSortType(selectedSortType as T.SortType);
    }
    if ((selectedSortReversed === 'false') === sortReversed) {
      toggleSortOrder();
    }
    recordEvent('list_sortbar_mode_changed', {
      description: selectedOption.text,
    });
  };

  const sortTypes = [
    {
      label: 'Name: A-Z',
      id: 'alphabetical',
      order: 'alphabetical',
      reversed: false,
    },
    {
      label: 'Name: Z-A',
      id: 'alphabetical-reversed',
      order: 'alphabetical',
      reversed: true,
    },
    {
      label: 'Created: Newest',
      id: 'creationDate',
      order: 'creationDate',
      reversed: false,
    },
    {
      label: 'Created: Oldest',
      id: 'creationDate-reversed',
      order: 'creationDate',
      reversed: true,
    },
    {
      label: 'Modified: Newest',
      id: 'modificationDate',
      order: 'modificationDate',
      reversed: false,
    },
    {
      label: 'Modified: Oldest',
      id: 'modificationDate-reversed',
      order: 'modificationDate',
      reversed: true,
    },
  ];

  return (
    <Fragment>
      {shouldDisplay && (
        <div className="sort-order-selector theme-color-fg-dim theme-color-border">
          <label htmlFor="sort-selection">Sort by</label>
          <select
            id="sort-selection"
            value={sortType + ' ' + sortReversed.toString()}
            onChange={changeSort}
          >
            {sortTypes.map((type) => (
              <option
                key={type.id}
                value={type.id}
                data-order={type.order}
                data-reversed={type.reversed}
              >
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
