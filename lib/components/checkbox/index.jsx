import React from 'react';
import PropTypes from 'prop-types';

import CheckmarkIcon from '../../icons/checkmark';
import CircleIcon from '../../icons/circle';

const Checkbox = ({ checked = false, onChange }) => {
  return (
    <div className="checkbox">
      <div className="checkbox__icon" aria-hidden="true">
        {checked ? <CheckmarkIcon /> : <CircleIcon />}
      </div>
      <input
        checked={checked}
        className="checkbox__input"
        onChange={onChange}
        type="checkbox"
      />
    </div>
  );
};

Checkbox.propTypes = {
  checked: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default Checkbox;
