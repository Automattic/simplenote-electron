import React from 'react';
import { CircularProgress } from '@material-ui/core';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const Spinner = ({ isWhite, ...props }) => {
  return (
    <CircularProgress
      classes={{
        root: 'spinner',
        circle: classnames('spinner__circle', { 'is-white': isWhite }),
      }}
      {...props}
    />
  );
};

Spinner.propTypes = {
  isWhite: PropTypes.bool,
};

export default Spinner;
