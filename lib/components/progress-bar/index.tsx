import React from 'react';
import { LinearProgress, LinearProgressProps } from '@material-ui/core';

const ProgressBar: React.FunctionComponent<LinearProgressProps> = (props) => {
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
