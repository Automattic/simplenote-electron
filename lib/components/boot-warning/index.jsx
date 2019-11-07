import React from 'react';
import PropTypes from 'prop-types';

import './style';

const BootWarning = () => {
  return (
    <h1>
      Simplenote cannot currently be opened simultaneously in more than one tab
      or window per browser.
    </h1>
  );
};

export default BootWarning;
