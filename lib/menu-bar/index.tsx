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
import NewNoteIcon from '../icons/new-note';
import MenuIcon from '../icons/menu';
import { withoutTags } from '../utils/filter-notes';
import { createNote, toggleNavigation } from '../state/ui/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import type * as T from '../types';

type OwnProps = {
  onNewNote: Function;
  noteBucket: object;
  onNoteOpened: Function;
};

type StateProps = {
  collection: T.Collection;
  openedTag: T.TagName | null;
  searchQuery: string;
};

type DispatchProps = {
  onNewNote: (content: string) => any;
  toggleNavigation: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export const MenuBar: FunctionComponent<Props> = ({
  collection,
  openedTag,
  onNewNote,
  searchQuery,
  toggleNavigation,
}) => {
  let placeholder;
  switch (collection.type) {
    case 'tag':
      placeholder = openedTag;
      break;
    case 'trash':
      placeholder = 'Trash';
      break;
    case 'untagged':
      placeholder = 'Untagged Notes';
      break;
    default:
      placeholder = 'All Notes';
      break;
  }

  return (
    <div className="menu-bar">
      <IconButton
        icon={<MenuIcon />}
        onClick={toggleNavigation}
        title={`Menu • ${CmdOrCtrl}+Shift+U`}
      />
      <div id="notes-title" className="notes-title" aria-hidden="true">
        {placeholder}
      </div>
      <IconButton
        icon={<NewNoteIcon />}
        onClick={() => onNewNote(withoutTags(searchQuery))}
        title={`New Note • ${CmdOrCtrl}+Shift+I`}
      />
    </div>
  );
};

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  collection: state.ui.collection,
  openedTag: selectors.openedTag(state),
  searchQuery: state.ui.searchQuery,
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
