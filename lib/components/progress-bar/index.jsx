import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';

const ProgressBar = () => {
  return (
    <LinearProgress
      classes={{
        root: 'progress-bar',
        bar: 'progress-bar__bar',
      }}
    />
  );
};

export default ProgressBar;
