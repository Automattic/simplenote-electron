import React, { FunctionComponent } from 'react';
import { CircularProgress } from '@material-ui/core';
import classnames from 'classnames';

type OwnProps = typeof CircularProgress & {
  isWhite: boolean;
};

const Spinner: FunctionComponent<OwnProps> = ({ isWhite, ...props }) => {
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
