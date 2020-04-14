import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

import AlertIcon from "../../icons/alert";
import SyncIcon from "../../icons/sync";
import SyncStatusPopover from "./popover";

import * as S from "../../state";
import * as T from "../../types";

type StateProps = {
  simperiumConnected: boolean;
  unsyncedNoteIds: T.EntityId[];
};

class SyncStatus extends Component<StateProps> {
  state = {
    anchorEl: null,
  };

  handlePopoverOpen = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handlePopoverClose = () => {
    this.setState({ anchorEl: null });
  };

  render() {
    const { simperiumConnected, unsyncedNoteIds } = this.props;
    const { anchorEl } = this.state;

    const popoverId = "sync-status__popover";

    const unsyncedChangeCount = unsyncedNoteIds.length;
    const unit = unsyncedChangeCount === 1 ? "change" : "changes";
    const text = unsyncedChangeCount
      ? `${unsyncedChangeCount} unsynced ${unit}`
      : simperiumConnected
      ? "All changes synced"
      : "No connection";

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
            {simperiumConnected ? <SyncIcon /> : <AlertIcon />}
          </span>
          {text}
        </div>

        <SyncStatusPopover
          anchorEl={anchorEl}
          id={popoverId}
          onClose={this.handlePopoverClose}
        />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { simperiumConnected, unsyncedNoteIds },
}) => ({
  simperiumConnected,
  unsyncedNoteIds,
});

export default connect(mapStateToProps)(SyncStatus);
