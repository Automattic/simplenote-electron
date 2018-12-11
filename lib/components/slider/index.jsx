import React from 'react';
import PropTypes from 'prop-types';

const Slider = ({ min, max, value, onChange }) => {
  return (
    <input
      className="slider"
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={onChange}
    />
  );
};

Slider.propTypes = {
  onChange: PropTypes.func,
  min: PropTypes.number,
  max: PropTypes.number,
  value: PropTypes.number,
};

export default Slider;
