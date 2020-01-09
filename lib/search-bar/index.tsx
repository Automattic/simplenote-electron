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

const {
  newNote,
  searchAndSelectFirstNote,
  toggleNavigation,
} = appState.actionCreators;
const { recordEvent } = tracks;

type Props = {
  onNewNote: Function;
  onToggleNavigation: Function;
  query: string;
  showTrash: boolean;
};

export const SearchBar: FunctionComponent<Props> = ({
  onNewNote,
  onToggleNavigation,
  query,
  showTrash,
}) => (
  <div className="search-bar theme-color-border">
    <IconButton icon={<MenuIcon />} onClick={onToggleNavigation} title="Menu" />
    <SearchField />
    <IconButton
      disabled={showTrash}
      icon={<NewNoteIcon />}
      onClick={() => onNewNote(withoutTags(query))}
      title="New Note"
    />
  </div>
);

const mapStateToProps = ({ appState: state }) => ({
  query: state.filter,
  showTrash: state.showTrash,
});

const mapDispatchToProps = (dispatch, { noteBucket, onNoteOpened }) => ({
  onNewNote: (content: string) => {
    dispatch(searchAndSelectFirstNote({ filter: '' }));
    dispatch(newNote({ noteBucket, content }));
    onNoteOpened();
    recordEvent('list_note_created');
  },
  onToggleNavigation: () => dispatch(toggleNavigation()),
});

SearchBar.displayName = 'SearchBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
