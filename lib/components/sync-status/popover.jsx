import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import Popover from '@material-ui/core/Popover';

class SyncStatusPopover extends React.Component {
  render() {
    const { anchorEl, classes = {}, id, onClose, theme } = this.props;
    const themeClass = `theme-${theme}`;
    const open = Boolean(anchorEl);

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
        Last synced: 7 seconds ago
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
};

const mapStateToProps = ({ settings }) => ({
  theme: settings.theme,
});

export default connect(mapStateToProps)(SyncStatusPopover);
