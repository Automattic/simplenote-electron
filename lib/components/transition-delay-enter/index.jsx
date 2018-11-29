import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

/**
 * A wrapper to delay the mounting of children.
 *
 * Useful for progress bars and spinners, that should generally have about a
 * 1000 ms delay before displaying to the user.
 */
class TransitionDelayEnter extends React.Component {
  static propTypes = {
    delay: PropTypes.number,
    children: PropTypes.node.isRequired,
  };

  static defaultProps = {
    delay: 1000,
  };

  state = {
    shouldRender: false,
  };

  componentDidMount() {
    this.timer = window.setTimeout(() => {
      this.setState({ shouldRender: true });
    }, this.props.delay);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return (
      <CSSTransition
        classNames="transition-delay-enter"
        in={this.state.shouldRender}
        mountOnEnter={true}
        timeout={200 /* fade-in speed */}
        unmountOnExit={true}
      >
        {this.props.children}
      </CSSTransition>
    );
  }
}

export default TransitionDelayEnter;
