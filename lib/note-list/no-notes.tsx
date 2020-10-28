import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import actions from '../state/actions';

import * as S from '../state';

const NoNotes = () => {
  const hasLoaded = useSelector((state: S.State) => state.ui.hasLoadedNotes);
  const searchQuery = useSelector((state: S.State) => state.ui.searchQuery);
  const dispatch = useDispatch();

  const getMessage = () => {
    return hasLoaded
      ? searchQuery.length
        ? 'No Results'
        : 'No Notes'
      : 'Loading Notes';
  };

  const getButton = () => {
    return searchQuery.length ? (
      <button
        onClick={() =>
          dispatch(actions.ui.createNote({ content: searchQuery }))
        }
      >
        Create a new note titled &quot;{searchQuery}&quot;
      </button>
    ) : (
      <button onClick={() => dispatch(actions.ui.createNote())}>
        Create a new note
      </button>
    );
  };

  return (
    <div className="note-list-placeholder">
      {getMessage()}
      {hasLoaded && getButton()}
    </div>
  );
};

export default NoNotes;
