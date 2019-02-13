import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import Popover from '@material-ui/core/Popover';

import { getLastSyncedTime } from '../../utils/sync/last-synced-time';

class SyncStatusPopover extends React.Component {
  render() {
    const {
      anchorEl,
      classes = {},
      id,
      onClose,
      theme,
      unsyncedChangeCount,
    } = this.props;
    const themeClass = `theme-${theme}`;
    const open = Boolean(anchorEl);

    const lastSyncedTime = distanceInWordsToNow(getLastSyncedTime(), {
      addSuffix: true,
    });

    return (
      <Popover
        id={id}
        className={classnames(
          'sync-status-popover',
          classes.popover,
          themeClass
        )}
        classes={{
          paper: classnames(
            'sync-status-popover__paper',
            'theme-color-bg',
            'theme-color-border',
            'theme-color-fg-dim',
            { 'has-unsynced-changes': !unsyncedChangeCount },
            classes.paper
          ),
        }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        onClose={onClose}
        PaperProps={{ square: true }}
        disableRestoreFocus
      >
        {!!unsyncedChangeCount && (
          <div className="sync-status-popover__unsynced theme-color-border">
            <h2 className="sync-status-popover__heading">
              Notes with unsynced changes
            </h2>
            <ul className="sync-status-popover__notes theme-color-fg">
              <li>Note 1</li>
              <li>Note with longer title</li>
              <li>Note 3</li>
            </ul>
            <div>
              If a note isn’t syncing, try switching networks or editing the
              note again.
            </div>
          </div>
        )}
        <span>Last synced: {lastSyncedTime}</span>
      </Popover>
    );
  }
}

SyncStatusPopover.propTypes = {
  anchorEl: PropTypes.object,
  classes: PropTypes.object,
  id: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  unsyncedChangeCount: PropTypes.number.isRequired,
};

const mapStateToProps = ({ settings }) => ({
  theme: settings.theme,
});

export default connect(mapStateToProps)(SyncStatusPopover);
