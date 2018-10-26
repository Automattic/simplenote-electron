import React from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';

const ProgressBar = props => {
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
