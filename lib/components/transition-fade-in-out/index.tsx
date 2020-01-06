import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

const TransitionFadeInOut = props => {
  const { children, wrapperClassName, shouldMount } = props;
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

TransitionFadeInOut.propTypes = {
  children: PropTypes.node.isRequired,
  wrapperClassName: PropTypes.string,
  shouldMount: PropTypes.bool.isRequired,
};

export default TransitionFadeInOut;
