import React from 'react';
import PropTypes from 'prop-types';

import CheckmarkIcon from '../../icons/checkmark';
import CircleIcon from '../../icons/circle';

const Checkbox = ({ checked = false, onChange }) => {
  // A custom checkbox with an ARIA role is used here to work around a bug in
  // DraftJS, where using a hidden <input type="checkbox"> will trigger a error.
  return (
    <span
      className="checkbox"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      tabIndex="0"
    >
      <span className="checkbox__icon" aria-hidden="true">
        {checked ? <CheckmarkIcon /> : <CircleIcon />}
      </span>
    </span>
  );
};

Checkbox.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func,
};

export default Checkbox;
