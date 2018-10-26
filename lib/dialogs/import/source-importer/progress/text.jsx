import React from 'react';
import PropTypes from 'prop-types';

const ImportProgressText = props => {
  const { currentValue, isDone } = props;

  const text = isDone
    ? `Done! ${currentValue} notes imported.`
    : `${currentValue} notes imported...`;

  return (
    <p role="status" aria-live="polite">
      {text}
    </p>
  );
};

ImportProgressText.propTypes = {
  currentValue: PropTypes.number.isRequired,
  isDone: PropTypes.bool.isRequired,
};

export default ImportProgressText;
