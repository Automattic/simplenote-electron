import React from 'react';
import PropTypes from 'prop-types';

export const IconButton = ({ icon, ...props }) => (
  <button className="icon-button" type="button" {...props}>
    {icon}
  </button>
);

IconButton.propTypes = {
  icon: PropTypes.element.isRequired,
};

export default IconButton;
