import React from 'react';
import PropTypes from 'prop-types';

export const CssClassWrapper = ({ children, className }) => (
  <span {...{ className }}>{children}</span>
);

CssClassWrapper.propTypes = {
  className: PropTypes.string.isRequired,
};

export default CssClassWrapper;
