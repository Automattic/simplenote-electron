import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

function CheckboxControl({ className, ...props }) {
  return (
    <span className={classNames('checkbox-control', className)}>
      <input type="checkbox" {...props} />
      <span className="checkbox-control-base">
        <span className="checkbox-control-checked" />
      </span>
    </span>
  );
}

CheckboxControl.propTypes = {
  className: PropTypes.string.isRequired,
};

export default CheckboxControl;
