/**
 * External dependencies
 */
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import IconButton from '../icon-button';
import NewNoteIcon from '../icons/new-note';
import SearchField from '../search-field';
import MenuIcon from '../icons/menu';
import { withoutTags } from '../utils/filter-notes';
import { createNote, search } from '../state/ui/actions';

import * as S from '../state';

const { newNote, toggleNavigation } = appState.actionCreators;
const { recordEvent } = tracks;

type OwnProps = {
  onNewNote: Function;
  onToggleNavigation: Function;
};

type StateProps = {
  searchQuery: string;
  showTrash: boolean;
};

type Props = OwnProps & StateProps;

export const SearchBar: FunctionComponent<Props> = ({
  onNewNote,
  onToggleNavigation,
  searchQuery,
  showTrash,
}) => (
  <div className="search-bar theme-color-border">
    <IconButton icon={<MenuIcon />} onClick={onToggleNavigation} title="Menu" />
    <SearchField />
    <IconButton
      disabled={showTrash}
      icon={<NewNoteIcon />}
      onClick={() => onNewNote(withoutTags(searchQuery))}
      title="New Note"
    />
  </div>
);

const mapStateToProps: S.MapState<StateProps> = ({
  appState: { showTrash },
  ui: { searchQuery },
}) => ({
  searchQuery,
  showTrash,
});

const mapDispatchToProps = (dispatch, { noteBucket }) => ({
  onNewNote: (content: string) => {
    dispatch(createNote());
    dispatch(search(''));
    dispatch(newNote({ noteBucket, content }));
    recordEvent('list_note_created');
  },
  onToggleNavigation: () => dispatch(toggleNavigation()),
});

SearchBar.displayName = 'SearchBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
