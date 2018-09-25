/**
 * External dependencies
 */
import React from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import appState from '../flux/app-state';
import { tracks } from '../analytics';
import IconButton from '../icon-button';
import NewNoteIcon from '../icons/new-note';
import SearchField from '../search-field';
import TagsIcon from '../icons/tags';
import { withoutTags } from '../utils/filter-notes';

const { newNote, search, toggleNavigation } = appState.actionCreators;
const { recordEvent } = tracks;

export const SearchBar = ({
  onNewNote,
  onToggleNavigation,
  query,
  showTrash,
}) => (
  <div className="search-bar theme-color-border">
    <IconButton icon={<TagsIcon />} onClick={onToggleNavigation} title="Tags" />
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

const mapDispatchToProps = (dispatch, { noteBucket }) => ({
  onNewNote: content => {
    dispatch(search({ filter: '' }));
    dispatch(newNote({ noteBucket, content }));
    recordEvent('list_note_created');
  },
  onToggleNavigation: () => dispatch(toggleNavigation()),
});

SearchBar.displayName = 'SearchBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
