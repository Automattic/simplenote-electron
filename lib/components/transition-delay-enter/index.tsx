import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

/**
 * A wrapper to delay the mounting of children.
 *
 * Useful for progress bars and spinners, that should generally have about a
 * 1000 ms delay before displaying to the user.
 */
const TransitionDelayEnter = ({ children, delay = 1000 }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <CSSTransition
      classNames="transition-delay-enter"
      in={shouldRender}
      mountOnEnter={true}
      timeout={200 /* fade-in speed */}
      unmountOnExit={true}
    >
      {children}
    </CSSTransition>
  );
};

TransitionDelayEnter.propTypes = {
  delay: PropTypes.number,
  children: PropTypes.node.isRequired,
};

export default TransitionDelayEnter;
