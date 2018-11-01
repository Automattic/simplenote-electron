import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import onClickOutside from 'react-onclickoutside';

import analytics from '../analytics';
import NavigationBarItem from './item';
import TagList from '../tag-list';
import NotesIcon from '../icons/notes';
import TrashIcon from '../icons/trash';
import SettingsIcon from '../icons/settings';
import { viewExternalUrl } from '../utils/url-utils';
import appState from '../flux/app-state';
import DialogTypes from '../../shared/dialog-types';

const {
  showAllNotesAndSelectFirst,
  selectTrash,
  showDialog,
  toggleNavigation,
} = appState.actionCreators;

export class NavigationBar extends Component {
  static displayName = 'NavigationBar';

  static propTypes = {
    selectTrash: PropTypes.func.isRequired,
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
    const { noteBucket, tagBucket } = this.props;

    return (
      <div className="navigation theme-color-bg theme-color-fg theme-color-border">
        <div className="navigation-folders">
          <NavigationBarItem
            icon={<NotesIcon />}
            isSelected={this.isSelected({ isTrashRow: false })}
            label="All Notes"
            onClick={this.props.onShowAllNotes}
          />
          <NavigationBarItem
            icon={<TrashIcon />}
            isSelected={this.isSelected({ isTrashRow: true })}
            label="Trash"
            onClick={this.onSelectTrash}
          />
        </div>
        <div className="navigation-tags theme-color-border">
          <TagList noteBucket={noteBucket} tagBucket={tagBucket} />
        </div>
        <div className="navigation-tools theme-color-border">
          <NavigationBarItem
            icon={<SettingsIcon />}
            label="Settings"
            onClick={this.props.onSettings}
          />
        </div>
        <div className="navigation-footer">
          <button
            type="button"
            className="navigation-footer-item theme-color-fg-dim"
            onClick={this.onHelpClicked}
          >
            Help &amp; Support
          </button>
          <button
            type="button"
            className="navigation-footer-item theme-color-fg-dim"
            onClick={this.props.onAbout}
          >
            About
          </button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = ({ appState: state }) => ({
  dialogs: state.dialogs,
  selectedTag: state.tag,
  showNavigation: state.showNavigation,
  showTrash: state.showTrash,
});

const mapDispatchToProps = dispatch => ({
  onAbout: () => dispatch(showDialog({ dialog: DialogTypes.ABOUT })),
  onOutsideClick: () => dispatch(toggleNavigation()),
  onShowAllNotes: () => dispatch(showAllNotesAndSelectFirst()),
  onSettings: () => dispatch(showDialog({ dialog: DialogTypes.SETTINGS })),
  selectTrash: () => dispatch(selectTrash()),
});

export default connect(mapStateToProps, mapDispatchToProps)(
  onClickOutside(NavigationBar)
);
