import React from 'react';
import classNames from 'classnames';

import CheckedCheckbox from '../../icons/checkbox-checked';
import UncheckedCheckbox from '../../icons/checkbox-unchecked';

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
        <CheckedCheckbox />
      ) : (
        <UncheckedCheckbox />
      )}
    </span>
  );
}

export default CheckboxControl;
