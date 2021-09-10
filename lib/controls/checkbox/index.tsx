import React from 'react';
import classNames from 'classnames';

type OwnProps = React.HTMLProps<HTMLInputElement> & {
  className?: string;
  onChange: () => any;
  isStandard?: boolean;
};

function CheckboxControl({
  className,
  isStandard,
  checked,
  ...props
}: OwnProps) {
  return (
    <span
      className={classNames('checkbox-control', [
        className,
        { 'checkbox-standard': isStandard },
      ])}
    >
      <input type="checkbox" {...props} checked={checked} />
      {!isStandard ? (
        <span className="checkbox-control-base">
          <span className="checkbox-control-checked" />
        </span>
      ) : checked ? (
        <svg
          className="checked"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <rect x="0" fill="none" width="24" height="24" />
          <path d="M19 3H5A2 2 0 0 0 3 5V19a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2V5A2 2 0 0 0 19 3ZM10.14 16.85 5.76 12.48l1.42-1.42 3 3 6.63-6.63 1.41 1.42Z" />
        </svg>
      ) : (
        <svg
          className="unchecked"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <rect x="0" fill="none" width="24" height="24" />
          <path d="M19 5h0V19H5V5H19m0-2H5A2 2 0 0 0 3 5V19a2 2 0 0 0 2 2H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
        </svg>
      )}
    </span>
  );
}

export default CheckboxControl;
