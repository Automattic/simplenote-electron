import React, { Component } from 'react';
import PropTypes from 'prop-types';

import AlertIcon from '../../icons/alert';
import SyncIcon from '../../icons/sync';
import SyncStatusPopover from './popover';

class SyncStatus extends Component {
  static propTypes = {
    isOffline: PropTypes.bool.isRequired,
    unsyncedNoteIds: PropTypes.array.isRequired,
  };

  state = {
    anchorEl: null,
  };

  handlePopoverOpen = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handlePopoverClose = () => {
    this.setState({ anchorEl: null });
  };

  render() {
    const { isOffline, unsyncedNoteIds } = this.props;
    const { anchorEl } = this.state;

    const popoverId = 'sync-status__popover';

    const unsyncedChangeCount = unsyncedNoteIds.length;
    const unit = unsyncedChangeCount === 1 ? 'change' : 'changes';
    const text = unsyncedChangeCount
      ? `${unsyncedChangeCount} unsynced ${unit}`
      : isOffline
      ? 'No connection'
      : 'All changes synced';

    return (
      <div>
        <div
          className="sync-status"
          aria-owns={anchorEl ? popoverId : undefined}
          aria-haspopup="true"
          onFocus={this.handlePopoverOpen}
          onMouseEnter={this.handlePopoverOpen}
          onMouseLeave={this.handlePopoverClose}
          tabIndex="0"
        >
          <span className="sync-status__icon">
            {isOffline ? <AlertIcon /> : <SyncIcon />}
          </span>
          {text}
        </div>

        <SyncStatusPopover
          anchorEl={anchorEl}
          id={popoverId}
          onClose={this.handlePopoverClose}
          unsyncedNoteIds={unsyncedNoteIds}
        />
      </div>
    );
  }
}

export default SyncStatus;
