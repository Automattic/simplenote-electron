import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

const TransitionFadeIn = props => {
  const { children, shouldMount } = props;
  return (
    <CSSTransition
      in={shouldMount}
      classNames="transition-fade-in"
      mountOnEnter
      timeout={200}
      unmountOnExit
    >
      <div>{children}</div>
    </CSSTransition>
  );
};

TransitionFadeIn.propTypes = {
  children: PropTypes.node.isRequired,
  shouldMount: PropTypes.bool.isRequired,
};

export default TransitionFadeIn;
