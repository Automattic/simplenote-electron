import React, { ElementType } from 'react';
import { Tooltip } from '@material-ui/core';

type OwnProps = {
  disableTooltip: boolean;
  icon: ElementType;
  title: string;
};

type Props = OwnProps;

export const IconButton = ({ icon, title, ...props }: Props) => (
  <Tooltip
    classes={{ tooltip: 'icon-button__tooltip' }}
    enterDelay={200}
    title={title}
  >
    <span>
      <button
        className="icon-button"
        type="button"
        data-title={title}
        {...props}
      >
        {icon}
      </button>
    </span>
  </Tooltip>
);

export default IconButton;
