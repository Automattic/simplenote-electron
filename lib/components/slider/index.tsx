import React, { ChangeEventHandler, FunctionComponent } from 'react';

type Props = {
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  min: number;
  max: number;
  value: number;
  list: string;
};

export const Slider: FunctionComponent<Props> = ({
  disabled,
  min,
  max,
  value,
  list,
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
    list={list}
    onChange={onChange}
  />
);

export default Slider;
