import React, { FunctionComponent, ReactNode } from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

type OwnProps = {
  children: ReactNode;
  shouldMount: boolean;
  wrapperClassName?: string;
};

const TransitionFadeInOut: FunctionComponent<OwnProps> = ({
  children,
  shouldMount,
  wrapperClassName = '',
}) => {
  return (
    <CSSTransition
      in={shouldMount}
      classNames="transition-fade-in-out"
      mountOnEnter
      timeout={200}
      unmountOnExit
    >
      <div className={wrapperClassName}>{children}</div>
    </CSSTransition>
  );
};

export default TransitionFadeInOut;
