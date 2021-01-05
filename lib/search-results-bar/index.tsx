/**
 * External dependencies
 */
import React, { FunctionComponent, useEffect, useRef } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import IconButton from '../icon-button';
import ChevronRightIcon from '../icons/chevron-right';

import * as S from '../state';

type StateProps = {
  selectedSearchMatchIndex: number | null;
  numberOfMatchesInNote: number;
};

type DispatchProps = {
  setSearchSelection: (index: number) => any;
};

type Props = StateProps & DispatchProps;

const SearchResultsBar: FunctionComponent<Props> = ({
  selectedSearchMatchIndex: index,
  numberOfMatchesInNote: total,
  setSearchSelection,
}) => {
  const setPrev = (event: MouseEvent) => {
    const newIndex = (total + (index ?? -1) - 1) % total;
    setSearchSelection(newIndex);
  };

  const setNext = (event: MouseEvent) => {
    const newIndex = (total + (index ?? -1) + 1) % total;
    setSearchSelection(newIndex);
  };

  return (
    <div className="search-results">
      <div>
        {index === null ? `${total} Results` : `${index + 1} of ${total}`}
      </div>
      <span className="search-results-next">
        <IconButton
          disabled={total <= 1}
          icon={<ChevronRightIcon />}
          onClick={setNext}
          title="Next"
        />
      </span>
      <span className="search-results-prev">
        <IconButton
          disabled={total <= 1}
          icon={<ChevronRightIcon />}
          onClick={setPrev}
          title="Prev"
        />
      </span>
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { selectedSearchMatchIndex, numberOfMatchesInNote },
}) => ({
  selectedSearchMatchIndex,
  numberOfMatchesInNote,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => ({
  setSearchSelection: (index: number) => {
    dispatch({ type: 'STORE_SEARCH_SELECTION', index: index });
  },
});

SearchResultsBar.displayName = 'SearchResultsBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchResultsBar);
