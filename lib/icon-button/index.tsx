import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '@material-ui/core';

export const IconButton = ({ icon, title, ...props }) => (
  <Tooltip
    classes={{ tooltip: 'icon-button__tooltip' }}
    enterDelay={200}
    title={title}
  >
    <button className="icon-button" type="button" {...props}>
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
