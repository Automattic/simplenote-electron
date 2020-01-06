import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

function ToggleControl({ className, ...props }) {
  return (
    <span className={classNames('toggle-control', className)}>
      <input type="checkbox" {...props} />
      <span className="toggle-control-layers">
        <span className="toggle-control-unchecked-color" />
        <span className="toggle-control-checked-color" />
        <span className="toggle-control-knob" />
      </span>
    </span>
  );
}

ToggleControl.propTypes = {
  className: PropTypes.string,
};

export default ToggleControl;
