import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { Popover } from '@material-ui/core';

import { getLastSyncedTime } from '../../utils/sync/last-synced-time';
import getNoteTitles from './get-note-titles';

class SyncStatusPopover extends React.Component {
  render() {
    const {
      anchorEl,
      classes = {},
      id,
      notes,
      onClose,
      theme,
      unsyncedNoteIds,
    } = this.props;
    const themeClass = `theme-${theme}`;
    const open = Boolean(anchorEl);
    const hasUnsyncedChanges = unsyncedNoteIds.length > 0;

    const QUERY_LIMIT = 10;
    const noteTitles = hasUnsyncedChanges
      ? getNoteTitles(unsyncedNoteIds, notes, QUERY_LIMIT)
      : [];
    const overflowCount = unsyncedNoteIds.length - noteTitles.length;
    const unit = overflowCount === 1 ? 'note' : 'notes';
    const lastSyncedTime = getLastSyncedTime();

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
            { 'has-unsynced-changes': hasUnsyncedChanges },
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
        onBlur={onClose}
        onClose={onClose}
        PaperProps={{ square: true }}
        disableRestoreFocus
      >
        {hasUnsyncedChanges && (
          <div className="sync-status-popover__unsynced theme-color-border">
            <h2 className="sync-status-popover__heading">
              Notes with unsynced changes
            </h2>
            <ul className="sync-status-popover__notes theme-color-fg">
              {noteTitles.map(note => (
                <li key={note.id}>{note.title}</li>
              ))}
            </ul>
            {!!overflowCount && (
              <p>
                and {overflowCount} more {unit}
              </p>
            )}
            <div>
              If a note isn’t syncing, try switching networks or editing the
              note again.
            </div>
          </div>
        )}
        {lastSyncedTime > -Infinity ? (
          <span>
            Last synced:{' '}
            {formatDistanceToNow(lastSyncedTime, { addSuffix: true })}
          </span>
        ) : (
          <span>Unknown sync status</span>
        )}
      </Popover>
    );
  }
}

SyncStatusPopover.propTypes = {
  anchorEl: PropTypes.object,
  classes: PropTypes.object,
  id: PropTypes.string,
  notes: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  theme: PropTypes.string.isRequired,
  unsyncedNoteIds: PropTypes.array.isRequired,
};

const mapStateToProps = ({ appState, settings }) => ({
  notes: appState.notes,
  theme: settings.theme,
});

export default connect(mapStateToProps)(SyncStatusPopover);
