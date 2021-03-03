/**
 * External dependencies
 */
import React, { FunctionComponent } from 'react';
import { connect } from 'react-redux';

/**
 * Internal dependencies
 */
import { CmdOrCtrl } from '../utils/platform';
import IconButton from '../icon-button';
import { isMac } from '../utils/platform';
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
  searchQuery: string;
  showCollection: T.Collection;
};

type DispatchProps = {
  onNewNote: (content: string) => any;
  toggleNavigation: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const MenuBar: FunctionComponent<Props> = ({
  onNewNote,
  searchQuery,
  showCollection,
  toggleNavigation,
}) => {
  let placeholder;
  switch (showCollection.type) {
    case 'tag':
      placeholder = 'Notes With Selected Tag';
      break;
    case 'trash':
      placeholder = 'Trash';
      break;
    default:
      placeholder = 'All Notes';
      break;
  }

  const CmdOrCtrl = isMac ? 'Cmd' : 'Ctrl';

  return (
    <div className="menu-bar theme-color-border">
      <IconButton
        icon={<MenuIcon />}
        onClick={toggleNavigation}
        title={`Menu • ${CmdOrCtrl}+Shift+U`}
      />
      <div className="notes-title">{placeholder}</div>
      <IconButton
        disabled={showCollection.type === 'trash'}
        icon={<NewNoteIcon />}
        onClick={() => onNewNote(withoutTags(searchQuery))}
        title={`New Note • ${CmdOrCtrl}+Shift+I`}
      />
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { searchQuery, showCollection },
}) => ({
  searchQuery,
  showCollection,
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
