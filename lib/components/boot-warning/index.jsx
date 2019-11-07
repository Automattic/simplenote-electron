import React from 'react';
import PropTypes from 'prop-types';

import './style';

const BootWarning = () => {
  return (
    <h3 className="boot-warning__message">
      Simplenote cannot be opened simultaneously in more than one tab or window
      per browser.
    </h3>
  );
};

export default BootWarning;
