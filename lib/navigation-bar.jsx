import React, { Component } from 'react';
import { connect } from 'react-redux';
import onClickOutside from 'react-onclickoutside';
import TagList from './tag-list';
import NotesIcon from './icons/notes';
import TrashIcon from './icons/trash';
import SettingsIcon from './icons/settings';
import { viewExternalUrl } from './utils/url-utils';
import classNames from 'classnames';
import appState from './flux/app-state';

const {
  selectAllNotes,
  selectTrash,
  showDialog,
  toggleNavigation,
} = appState.actionCreators;

export class NavigationBar extends Component {
  static displayName = 'NavigationBar';

  static defaultProps = {
    onSelectAllNotes: function() {},
    onSelectTrash: function() {},
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

  // Determine if the selected class should be applied for the 'all notes' or 'trash' rows
  getNavigationItemClass = isTrashRow => {
    const { showTrash, selectedTag } = this.props;
    const isItemSelected = isTrashRow === showTrash;

    return isItemSelected && !selectedTag
      ? 'navigation-folders-item-selected'
      : 'navigation-folders-item';
  };

  render() {
    const { noteBucket, tagBucket } = this.props;
    const classes = classNames('button', 'button-borderless', 'theme-color-fg');
    const allNotesClasses = classNames(
      this.getNavigationItemClass(false),
      classes
    );
    const trashClasses = classNames(this.getNavigationItemClass(true), classes);

    return (
      <div className="navigation theme-color-bg theme-color-fg theme-color-border">
        <div className="navigation-folders">
          <button
            type="button"
            className={allNotesClasses}
            onClick={this.props.onSelectAllNotes}
          >
            <span className="navigation-icon">
              <NotesIcon />
            </span>
            All Notes
          </button>
          <button
            type="button"
            className={trashClasses}
            onClick={this.props.onSelectTrash}
          >
            <span className="navigation-icon">
              <TrashIcon />
            </span>
            Trash
          </button>
        </div>
        <div className="navigation-tags theme-color-border">
          <TagList noteBucket={noteBucket} tagBucket={tagBucket} />
        </div>
        <div className="navigation-tools theme-color-border">
          <button
            type="button"
            className="navigation-tools-item button button-borderless theme-color-fg"
            onClick={this.props.onSettings}
          >
            <span className="navigation-icon">
              <SettingsIcon />
            </span>
            Settings
          </button>
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
  onAbout: () =>
    dispatch(
      showDialog({
        dialog: {
          type: 'About',
          modal: true,
          single: true,
        },
      })
    ),
  onOutsideClick: () => dispatch(toggleNavigation()),
  onSelectAllNotes: () => dispatch(selectAllNotes()),
  onSelectTrash: () => dispatch(selectTrash()),
  onSettings: () =>
    dispatch(
      showDialog({
        dialog: {
          type: 'Settings',
          modal: true,
          single: true,
        },
      })
    ),
});

export default connect(mapStateToProps, mapDispatchToProps)(
  onClickOutside(NavigationBar)
);
