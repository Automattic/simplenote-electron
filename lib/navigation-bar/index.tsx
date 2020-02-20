import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';

import analytics from '../analytics';
import NavigationBarItem from './item';
import TagList from '../tag-list';
import NotesIcon from '../icons/notes';
import TrashIcon from '../icons/trash';
import SettingsIcon from '../icons/settings';
import SyncStatus from '../components/sync-status';
import { viewExternalUrl } from '../utils/url-utils';
import appState from '../flux/app-state';
import DialogTypes from '../../shared/dialog-types';

import { toggleNavigation } from '../state/ui/actions';

import * as S from '../state';
import * as T from '../types';

type OwnProps = {
  isElectron: boolean;
};

type StateProps = {
  autoHideMenuBar: boolean;
  dialogs: unknown[];
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
};

type Props = OwnProps & StateProps & DispatchProps;

export class NavigationBar extends Component<Props> {
  static displayName = 'NavigationBar';

  static defaultProps = {
    onShowAllNotes: function() {},
  };

  // Used by onClickOutside wrapper
  handleClickOutside = () => {
    const { dialogs, onOutsideClick, showNavigation } = this.props;

    if (dialogs.length > 0) {
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
    const {
      autoHideMenuBar,
      isElectron,
      onAbout,
      onSettings,
      onShowAllNotes,
    } = this.props;
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

        <div className="navigation-bar__sync-status theme-color-fg-dim theme-color-border">
          <SyncStatus />
        </div>
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  appState: state,
  settings,
  ui: { openedTag, showNavigation, showTrash },
}) => ({
  autoHideMenuBar: settings.autoHideMenuBar,
  dialogs: state.dialogs,
  openedTag,
  showNavigation,
  showTrash,
});

const {
  showAllNotesAndSelectFirst,
  selectTrash,
  showDialog,
} = appState.actionCreators;

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  onAbout: () => showDialog({ dialog: DialogTypes.ABOUT }),
  onOutsideClick: toggleNavigation,
  onShowAllNotes: showAllNotesAndSelectFirst,
  onSettings: () => showDialog({ dialog: DialogTypes.SETTINGS }),
  selectTrash,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(onClickOutside(NavigationBar));
