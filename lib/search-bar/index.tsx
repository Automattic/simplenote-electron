/**
 * External dependencies
 */
import React, { Component } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import appState from '../flux/app-state';
import analytics from '../analytics';
import IconButton from '../icon-button';
import NewNoteIcon from '../icons/new-note';
import SearchField from '../search-field';
import MenuIcon from '../icons/menu';
import { withoutTags } from '../utils/filter-notes';
import { createNote, search, toggleNavigation } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

const { newNote } = appState.actionCreators;

type OwnProps = {
  onNewNote: Function;
  noteBucket: object;
  onNoteOpened: Function;
};

type StateProps = {
  searchQuery: string;
  showTrash: boolean;
};

type DispatchProps = {
  toggleNavigation: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const SearchBar: Component<Props> = ({
  onNewNote,
  searchQuery,
  showTrash,
  toggleNavigation,
}) => (
  <div className="search-bar theme-color-border">
    <IconButton
      icon={<MenuIcon />}
      onClick={toggleNavigation}
      title="Menu • Ctrl+Shift+T"
    />
    <SearchField />
    <IconButton
      disabled={showTrash}
      icon={<NewNoteIcon />}
      onClick={() => onNewNote(withoutTags(searchQuery))}
      title="New Note • Ctrl+Shift+N"
    />
  </div>
);

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { searchQuery, showTrash },
}) => ({
  searchQuery,
  showTrash,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps, OwnProps> = (
  dispatch,
  { noteBucket }
) => ({
  onNewNote: (content: string) => {
    dispatch(createNote());
    dispatch(search(''));
    dispatch(newNote({ noteBucket, content }));
    analytics.tracks.recordEvent('list_note_created');
  },
  toggleNavigation: () => {
    dispatch(toggleNavigation());
  },
});

SearchBar.displayName = 'SearchBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
