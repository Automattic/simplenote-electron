import React from 'react';
import PropTypes from 'prop-types';

const ImportProgressText = props => {
  const { currentValue, isDone } = props;

  const unit = currentValue === 1 ? 'note' : 'notes';
  let text;

  if (isDone) {
    text = `Done! ${currentValue} ${unit} imported.`;
  } else {
    text = currentValue
      ? `${currentValue} ${unit} imported...`
      : 'Importing...';
  }

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
