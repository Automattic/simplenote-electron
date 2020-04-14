import React, { ChangeEventHandler, FunctionComponent } from "react";

type Props = {
  onChange: ChangeEventHandler<HTMLInputElement>;
  min: number;
  max: number;
  value: number;
};

export const Slider: FunctionComponent<Props> = ({
  min,
  max,
  value,
  onChange,
}) => (
  <input
    className="slider"
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={onChange}
  />
);

export default Slider;
