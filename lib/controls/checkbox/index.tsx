import React from 'react';
import classNames from 'classnames';

type OwnProps = {
  className?: string;
  checked: boolean;
  id: string;
  name: string;
  onChange: () => {};
  type: 'radio';
  value: string;
};

function CheckboxControl({ className, ...props }: OwnProps) {
  return (
    <span className={classNames('checkbox-control', className)}>
      <input type="checkbox" {...props} />
      <span className="checkbox-control-base">
        <span className="checkbox-control-checked" />
      </span>
    </span>
  );
}

export default CheckboxControl;
