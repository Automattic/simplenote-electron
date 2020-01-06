import React from 'react';
import PropTypes from 'prop-types';

import ImportProgressBar from './bar';
import ImportProgressText from './text';

const ImportProgress = ({ currentValue, endValue, isDone }) => {
  return (
    <section>
      <ImportProgressBar
        currentValue={currentValue}
        endValue={isDone ? currentValue : endValue}
        isDone={isDone}
      />
      <ImportProgressText currentValue={currentValue} isDone={isDone} />
    </section>
  );
};

ImportProgress.propTypes = {
  currentValue: PropTypes.number.isRequired,
  endValue: PropTypes.number,
  isDone: PropTypes.bool.isRequired,
};

export default ImportProgress;
