import React from 'react';
import PropTypes from 'prop-types';

import './style';

const BootWarning = ({ children }) => (
  <h3 className="boot-warning__message">{children}</h3>
);

BootWarning.propTypes = {
  children: PropTypes.node.isRequired,
};

export default BootWarning;
