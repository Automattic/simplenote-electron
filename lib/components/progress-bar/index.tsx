import React from 'react';
import { LinearProgress } from '@mui/material';

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
