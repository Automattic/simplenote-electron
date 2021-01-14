/**
 * External dependencies
 */
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import IconButton from '../icon-button';
import NewNoteIcon from '../icons/new-note';
import MenuIcon from '../icons/menu';
import { withoutTags } from '../utils/filter-notes';
import { createNote, toggleNavigation } from '../state/ui/actions';

import * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  onNewNote: Function;
  noteBucket: object;
  onNoteOpened: Function;
};

type StateProps = {
  openedTag: T.Tag | null;
  searchQuery: string;
  showTrash: boolean;
};

type DispatchProps = {
  onNewNote: (content: string) => any;
  toggleNavigation: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const MenuBar: FunctionComponent<Props> = ({
  onNewNote,
  openedTag,
  searchQuery,
  showTrash,
  toggleNavigation,
}) => {
  // let placeholder = showTrash ? 'Trash' : openedTag?.name ?? 'All Notes';
  const placeholder = showTrash
    ? 'Trash'
    : openedTag
    ? 'Notes With Selected Tag'
    : 'All Notes';
  // let placeholder = showTrash ? 'Trash' : 'All Notes';
  // if(openedTag) {
  //   placeholder = 'Notes with Selected Tag';
  // }
  // placeholder = (openedTag ? 'Notes with tag ' : '') + placeholder;
  // placeholder = (openedTag ? 'Notes with selected tag' )

  return (
    <div className="menu-bar theme-color-border">
      <IconButton
        icon={<MenuIcon />}
        onClick={toggleNavigation}
        title="Menu • Ctrl+Shift+U"
      />
      {placeholder}
      <IconButton
        disabled={showTrash}
        icon={<NewNoteIcon />}
        onClick={() => onNewNote(withoutTags(searchQuery))}
        title="New Note • Ctrl+Shift+I"
      />
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = ({
  data,
  ui: { openedTag, searchQuery, showTrash },
}) => ({
  openedTag: openedTag ? data.tags.get(openedTag) ?? null : null,
  searchQuery,
  showTrash,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps, OwnProps> = (
  dispatch
) => ({
  onNewNote: (content: string) => {
    dispatch(createNote(content));
  },
  toggleNavigation: () => {
    dispatch(toggleNavigation());
  },
});

MenuBar.displayName = 'MenuBar';

export default connect(mapStateToProps, mapDispatchToProps)(MenuBar);
