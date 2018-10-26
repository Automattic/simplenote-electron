import React from 'react';
import PropTypes from 'prop-types';

const ImportProgressText = props => {
  const { currentValue, isDone } = props;

  const unit = currentValue === 1 ? 'note' : 'notes';

  const text = isDone
    ? `Done! ${currentValue} ${unit} imported.`
    : `${currentValue} ${unit} imported...`;

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
