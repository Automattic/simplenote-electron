import React from 'react';
import classNames from 'classnames';

type OwnProps = React.HTMLProps<HTMLInputElement> & {
  className?: string;
  onChange: () => any;
  isStandard?: boolean;
};

function CheckboxControl({ className, isStandard, ...props }: OwnProps) {
  return (
    <span
      className={classNames('checkbox-control', [
        className,
        { 'checkbox-standard': isStandard },
      ])}
    >
      <input type="checkbox" {...props} />
      <span className="checkbox-control-base">
        <span className="checkbox-control-checked" />
      </span>
    </span>
  );
}

export default CheckboxControl;
