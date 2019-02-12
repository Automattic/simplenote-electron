import React from 'react';
import PropTypes from 'prop-types';

import AlertIcon from '../../icons/alert';
import SyncIcon from '../../icons/sync';

const SyncStatus = ({ isOffline, unsyncedChangeCount }) => {
  const unit = unsyncedChangeCount === 1 ? 'change' : 'changes';
  const text = unsyncedChangeCount
    ? `${unsyncedChangeCount} unsynced ${unit}`
    : isOffline ? 'No connection' : 'All changes synced';

  return (
    <div className="sync-status">
      <span className="sync-status__icon">
        {isOffline ? <AlertIcon /> : <SyncIcon />}
      </span>
      {text}
    </div>
  );
};

SyncStatus.propTypes = {
  isOffline: PropTypes.bool.isRequired,
  unsyncedChangeCount: PropTypes.number.isRequired,
};

export default SyncStatus;
