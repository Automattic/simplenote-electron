import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';

import analytics from '../analytics';
import { isElectron } from '../utils/platform';
import NavigationBarItem from './item';
import TagList from '../tag-list';
import NotesIcon from '../icons/notes';
import TrashIcon from '../icons/trash';
import SettingsIcon from '../icons/settings';
import { viewExternalUrl } from '../utils/url-utils';

import { showDialog, toggleNavigation, selectTrash } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type StateProps = {
  autoHideMenuBar: boolean;
  isDialogOpen: boolean;
  openedTag: T.TagEntity | null;
  showNavigation: boolean;
  showTrash: boolean;
};

type DispatchProps = {
  onAbout: () => any;
  onOutsideClick: () => any;
  onSettings: () => any;
  onShowAllNotes: () => any;
  selectTrash: () => any;
  showKeyboardShortcuts: () => any;
};

type Props = StateProps & DispatchProps;

export class NavigationBar extends Component<Props> {
  static displayName = 'NavigationBar';

  // Used by onClickOutside wrapper
  handleClickOutside = () => {
    const { isDialogOpen, onOutsideClick, showNavigation } = this.props;

    if (isDialogOpen) {
      return;
    }

    if (showNavigation) {
      onOutsideClick();
    }
  };

  onHelpClicked = () => viewExternalUrl('http://simplenote.com/help');

  onSelectTrash = () => {
    this.props.selectTrash();
    analytics.tracks.recordEvent('list_trash_viewed');
  };

  // Determine if the selected class should be applied for the 'all notes' or 'trash' rows
  isSelected = ({ isTrashRow }: { isTrashRow: boolean }) => {
    const { showTrash, openedTag } = this.props;
    const isItemSelected = isTrashRow === showTrash;

    return isItemSelected && !openedTag;
  };

  render() {
    const { autoHideMenuBar, onAbout, onSettings, onShowAllNotes } = this.props;
    return (
      <div className="navigation-bar theme-color-bg theme-color-fg theme-color-border">
        <div className="navigation-bar__folders">
          <NavigationBarItem
            icon={<NotesIcon />}
            isSelected={this.isSelected({ isTrashRow: false })}
            label="All Notes"
            onClick={onShowAllNotes}
          />
          <NavigationBarItem
            icon={<TrashIcon />}
            isSelected={this.isSelected({ isTrashRow: true })}
            label="Trash"
            onClick={this.onSelectTrash}
          />
        </div>
        <div className="navigation-bar__tags theme-color-border">
          <TagList />
        </div>

        {(!isElectron || autoHideMenuBar) && (
          <Fragment>
            <div className="navigation-bar__tools theme-color-border">
              <NavigationBarItem
                icon={<SettingsIcon />}
                label="Settings"
                onClick={onSettings}
              />
            </div>
            <div className="navigation-bar__footer">
              <button
                type="button"
                className="navigation-bar__footer-item theme-color-fg-dim"
                onClick={this.props.showKeyboardShortcuts}
              >
                Keyboard Shortcuts
              </button>
            </div>
            <div className="navigation-bar__footer">
              <button
                type="button"
                className="navigation-bar__footer-item theme-color-fg-dim"
                onClick={this.onHelpClicked}
              >
                Help &amp; Support
              </button>
              <button
                type="button"
                className="navigation-bar__footer-item theme-color-fg-dim"
                onClick={onAbout}
              >
                About
              </button>
            </div>
          </Fragment>
        )}
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  settings,
  ui: { dialogs, openedTag, showNavigation, showTrash },
}) => ({
  autoHideMenuBar: settings.autoHideMenuBar,
  isDialogOpen: dialogs.length > 0,
  openedTag,
  showNavigation,
  showTrash,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  onAbout: () => showDialog('ABOUT'),
  onOutsideClick: toggleNavigation,
  onShowAllNotes: () => {
    throw new Error('Add me!');
  },
  onSettings: () => showDialog('SETTINGS'),
  selectTrash,
  showKeyboardShortcuts: () => showDialog('KEYBINDINGS'),
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(onClickOutside(NavigationBar));
