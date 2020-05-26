/**
 * External dependencies
 */
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import analytics from '../analytics';
import IconButton from '../icon-button';
import NewNoteIcon from '../icons/new-note';
import SearchField from '../search-field';
import MenuIcon from '../icons/menu';
import { withoutTags } from '../utils/filter-notes';
import { createNote, toggleNavigation } from '../state/ui/actions';

import * as S from '../state';

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
  onNewNote: (content: string) => any;
  toggleNavigation: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const SearchBar: FunctionComponent<Props> = ({
  onNewNote,
  searchQuery,
  showTrash,
  toggleNavigation,
}) => (
  <div className="search-bar theme-color-border">
    <IconButton
      icon={<MenuIcon />}
      onClick={toggleNavigation}
      title="Menu • Ctrl+Shift+U"
    />
    <SearchField />
    <IconButton
      disabled={showTrash}
      icon={<NewNoteIcon />}
      onClick={() => onNewNote(withoutTags(searchQuery))}
      title="New Note • Ctrl+Shift+I"
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
  dispatch
) => ({
  onNewNote: (content: string) => {
    dispatch(createNote(content));
    analytics.tracks.recordEvent('list_note_created');
  },
  toggleNavigation: () => {
    dispatch(toggleNavigation());
  },
});

SearchBar.displayName = 'SearchBar';

export default connect(mapStateToProps, mapDispatchToProps)(SearchBar);
