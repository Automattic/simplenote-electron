import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from '@material-ui/core/Tooltip';

export const IconButton = ({ disableTooltip, icon, title, ...props }) => (
  <Tooltip
    enterDelay={200}
    open={disableTooltip ? false : undefined}
    title={title}
  >
    <button
      className="icon-button"
      type="button"
      aria-label={disableTooltip ? title : undefined}
      {...props}
    >
      {icon}
    </button>
  </Tooltip>
);

IconButton.propTypes = {
  disableTooltip: PropTypes.bool,
  icon: PropTypes.element.isRequired,
  title: PropTypes.string.isRequired,
};

export default IconButton;
