import React from 'react';

type OwnProps = {
  value: number;
};

const ProgressBar = (props: OwnProps) => {
  const { value } = props;
  const completedStyle = {
    width: `${value}%`,
  };
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="completed" style={completedStyle}></div>
    </div>
  );
};

export default ProgressBar;
