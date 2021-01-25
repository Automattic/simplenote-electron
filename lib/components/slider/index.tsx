import React, { ChangeEventHandler, FunctionComponent } from 'react';

type Props = {
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  min: number;
  max: number;
  value: number;
};

export const Slider: FunctionComponent<Props> = ({
  disabled,
  min,
  max,
  value,
  onChange,
}) => (
  <input
    aria-label="Select revision"
    className="slider"
    disabled={disabled}
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={onChange}
  />
);

export default Slider;
