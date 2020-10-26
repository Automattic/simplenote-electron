import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import actions from '../state/actions';

import * as S from '../state';

const NoNotes = () => {
  const hasLoaded = useSelector((state: S.State) => state.ui.hasLoadedNotes);
  const searchQuery = useSelector((state: S.State) => state.ui.searchQuery);
  const dispatch = useDispatch();

  if (!hasLoaded) {
    return <div className="note-list-placeholder">Loading Notes</div>;
  }

  if (searchQuery.length) {
    return (
      <div className="note-list-placeholder">
        No Results{' '}
        <button
          onClick={() =>
            dispatch(actions.ui.createNote({ content: searchQuery }))
          }
        >
          Create a new note titled &quot;{searchQuery}&quot;
        </button>
      </div>
    );
  }

  return (
    <div className="note-list-placeholder">
      No Notes{' '}
      <button onClick={() => dispatch(actions.ui.createNote())}>
        Create a new note
      </button>
    </div>
  );
};

export default NoNotes;
