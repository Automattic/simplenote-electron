import React, { ElementType } from 'react';
import { Tooltip } from '@wordpress/components';

type OwnProps = {
  disableTooltip: boolean;
  icon: ElementType;
  title: string;
};

type Props = OwnProps;

export const IconButton = ({ icon, title, ...props }: Props) => (
  <Tooltip position="bottom center" text={title}>
    <button
      aria-label={title}
      className="icon-button"
      type="button"
      data-title={title}
      {...props}
    >
      {icon}
    </button>
  </Tooltip>
);

export default IconButton;
