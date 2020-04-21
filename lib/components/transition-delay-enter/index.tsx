import React, {
  FunctionComponent,
  useEffect,
  useState,
  ReactChild,
} from 'react';
import { CSSTransition } from 'react-transition-group';

type OwnProps = {
  children: ReactChild;
  delay: number;
};

/**
 * A wrapper to delay the mounting of children.
 *
 * Useful for progress bars and spinners, that should generally have about a
 * 1000 ms delay before displaying to the user.
 */
const TransitionDelayEnter: FunctionComponent<OwnProps> = ({
  children,
  delay = 1000,
}) => {
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

export default TransitionDelayEnter;
