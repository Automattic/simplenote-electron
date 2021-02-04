import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';
import { setSortType } from '../state/settings/actions';
import { recordEvent } from '../state/analytics/middleware';

import * as S from '../state';
import * as T from '../types';

type SortOption = {
  label: string;
  type: T.SortType;
  isReversed: boolean;
};

const sortTypes: SortOption[] = [
  {
    label: 'Name: A-Z',
    type: 'alphabetical',
    isReversed: false,
  },
  {
    label: 'Name: Z-A',
    type: 'alphabetical',
    isReversed: true,
  },
  {
    label: 'Created: Newest',
    type: 'creationDate',
    isReversed: false,
  },
  {
    label: 'Created: Oldest',
    type: 'creationDate',
    isReversed: true,
  },
  {
    label: 'Modified: Newest',
    type: 'modificationDate',
    isReversed: false,
  },
  {
    label: 'Modified: Oldest',
    type: 'modificationDate',
    isReversed: true,
  },
];

type StateProps = {
  sortReversed: boolean;
  sortType: T.SortType;
};

type DispatchProps = {
  setSortType: (sortType: T.SortType, sortReversed: boolean) => any;
};

type Props = StateProps & DispatchProps;

export const SortOrderSelector: FunctionComponent<Props> = ({
  setSortType,
  sortReversed,
  sortType,
}) => {
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = event.currentTarget.selectedIndex;
    if (-1 === selectedIndex) {
      return;
    }
    const sort = sortTypes[selectedIndex];
    setSortType(sort.type as T.SortType, sort.isReversed);
    recordEvent('list_sortbar_mode_changed', {
      description: event.currentTarget.options[selectedIndex].text,
    });
  };

  const sortTypesIndex = (type: T.SortType, reversed: boolean) =>
    sortTypes.findIndex(
      (input) => input.type === type && input.isReversed === reversed
    );

  return (
    <div className="sort-order-selector theme-color-fg-dim theme-color-border">
      <label htmlFor="sort-selection">Sort by</label>
      <select
        id="sort-selection"
        value={sortTypesIndex(sortType, sortReversed)}
        onChange={onChange}
      >
        {sortTypes.map((type, index) => (
          <option key={type.label} value={index}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  sortReversed: state.settings.sortReversed,
  sortType: state.settings.sortType,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  setSortType,
};

export default connect(mapStateToProps, mapDispatchToProps)(SortOrderSelector);
