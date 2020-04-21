import React, { FunctionComponent } from 'react';
import { CircularProgress, CircularProgressProps } from '@material-ui/core';
import classnames from 'classnames';

const Spinner = ({
  isWhite,
  ...props
}: CircularProgressProps & { isWhite?: boolean }) => {
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

export default Spinner;
