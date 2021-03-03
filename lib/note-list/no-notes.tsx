import React, { Component } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import NotesIcon from '../icons/notes';
import TagIcon from '../icons/tag';
import TrashIcon from '../icons/trash';

import actions from '../state/actions';

import * as S from '../state';

type EmptyNoteListPlaceholder = {
  message: String;
  icon: JSX.Element | null;
  button: JSX.Element | null;
};

const NoNotes = () => {
  const hasLoaded = useSelector((state: S.State) => state.ui.hasLoadedNotes);
  const searchQuery = useSelector((state: S.State) => state.ui.searchQuery);
  const showCollection = useSelector(
    (state: S.State) => state.ui.showCollection
  );
  const dispatch = useDispatch();

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
        Create your first note
      </button>
    );
  };

  const placeholderInfo = ({
    searchQuery,
    showCollection,
  }): EmptyNoteListPlaceholder => {
    if (searchQuery.length > 0) {
      return { message: 'No Results', icon: null, button: getButton() };
    }

    switch (showCollection.type) {
      case 'tag':
        return {
          message: `No notes tagged "${showCollection.tagName}"`,
          icon: <TagIcon />,
          button: null,
        };
      case 'trash':
        return {
          message: 'Your trash is empty',
          icon: <TrashIcon />,
          button: null,
        };
      default:
        return {
          message: '',
          icon: <NotesIcon />,
          button: getButton(),
        };
    }
  };

  const { message, icon, button } = placeholderInfo({
    searchQuery,
    showCollection,
  });

  return (
    <div className="note-list-placeholder theme-color-fg">
      <div className="no-notes-icon">{icon}</div>
      <div className="no-notes-message">{message}</div>
      <div className="no-notes-button">{hasLoaded && button}</div>
    </div>
  );
};

export default NoNotes;
