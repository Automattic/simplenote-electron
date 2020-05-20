import React, { ChangeEventHandler, FunctionComponent } from 'react';

type OwnProps = Partial<HTMLInputElement> & {
  onChange: (isNowToggled: boolean) => any;
};

type Props = OwnProps;

export const ToggleControl: FunctionComponent<Props> = ({
  className,
  onChange,
  ...props
}) => {
  const onToggle: ChangeEventHandler<HTMLInputElement> = ({
    currentTarget: { checked },
  }) => onChange(checked);

  return (
    <span className={`toggle-control ${className}`}>
      <input type="checkbox" onChange={onToggle} {...props} />
      <span className="toggle-control-layers">
        <span className="toggle-control-unchecked-color" />
        <span className="toggle-control-checked-color" />
        <span className="toggle-control-knob" />
      </span>
    </span>
  );
};

export default ToggleControl;
