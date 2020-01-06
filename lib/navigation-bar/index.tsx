import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
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

export class NavigationBar extends Component {
  static displayName = 'NavigationBar';

  static propTypes = {
    autoHideMenuBar: PropTypes.bool,
    dialogs: PropTypes.array.isRequired,
    isElectron: PropTypes.bool.isRequired,
    isOffline: PropTypes.bool.isRequired,
    onAbout: PropTypes.func.isRequired,
    onOutsideClick: PropTypes.func.isRequired,
    onSettings: PropTypes.func.isRequired,
    onShowAllNotes: PropTypes.func.isRequired,
    selectTrash: PropTypes.func.isRequired,
    selectedTag: PropTypes.object,
    showNavigation: PropTypes.bool.isRequired,
    showTrash: PropTypes.bool.isRequired,
    unsyncedNoteIds: PropTypes.array.isRequired,
  };

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
  isSelected = ({ isTrashRow }) => {
    const { showTrash, selectedTag } = this.props;
    const isItemSelected = isTrashRow === showTrash;

    return isItemSelected && !selectedTag;
  };

  render() {
    const {
      autoHideMenuBar,
      isElectron,
      isOffline,
      onAbout,
      onSettings,
      onShowAllNotes,
      unsyncedNoteIds,
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
          <SyncStatus isOffline={isOffline} unsyncedNoteIds={unsyncedNoteIds} />
        </div>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state, settings }) => ({
  autoHideMenuBar: settings.autoHideMenuBar,
  dialogs: state.dialogs,
  isOffline: state.isOffline,
  selectedTag: state.tag,
  showNavigation: state.showNavigation,
  showTrash: state.showTrash,
  unsyncedNoteIds: state.unsyncedNoteIds,
});

const {
  showAllNotesAndSelectFirst,
  selectTrash,
  showDialog,
  toggleNavigation,
} = appState.actionCreators;

const mapDispatchToProps = {
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
