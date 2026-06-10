import React, { FunctionComponent, ReactNode, useRef } from 'react';
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
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <CSSTransition
      nodeRef={nodeRef}
      in={shouldMount}
      classNames="transition-fade-in-out"
      mountOnEnter
      timeout={200}
      unmountOnExit
    >
      <div ref={nodeRef} className={wrapperClassName}>
        {children}
      </div>
    </CSSTransition>
  );
};

export default TransitionFadeInOut;
