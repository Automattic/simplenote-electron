import React, { ChangeEventHandler, FunctionComponent } from 'react';

type OwnProps = {
  disabled: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  min: number;
  max: number;
  value: number;
};

type Props = OwnProps & React.HTMLProps<HTMLInputElement>;

export const Slider: FunctionComponent<Props> = ({
  'aria-valuetext': ariaValueText,
  disabled,
  min,
  max,
  value,
  onChange,
}) => (
  <input
    aria-valuetext={ariaValueText}
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
