import React from 'react';
import { LinearProgress } from '@material-ui/core';

const ProgressBar: typeof LinearProgress = (props) => {
  return (
    <LinearProgress
      classes={{
        root: 'progress-bar',
        bar: 'progress-bar__bar',
      }}
      {...props}
    />
  );
};

export default ProgressBar;
