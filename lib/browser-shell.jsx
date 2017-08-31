import React, { Component } from 'react';

/**
 * Get window-related attributes
 *
 * There is no need for `this` here; `window` is global
 *
 * @returns {{windowWidth: Number, isSmallScreen: boolean}} window attributes
 */
const getState = () => {
  const windowWidth = window.innerWidth;

  return {
    windowWidth,
    isSmallScreen: windowWidth <= 750, // Magic number here corresponds to $single-column value in variables.scss
  };
};

/**
 * Passes window-related attributes into child component
 *
 * Passes:
 *   - viewport width (including scrollbar)
 *   - whether width is considered small
 *
 * @param {Element} Wrapped React component dependent on window attributes
 * @returns {Component} wrapped React component with window attributes as props
 */
export const browserShell = Wrapped =>
  class extends Component {
    state = getState();

    componentDidMount() {
      window.addEventListener('resize', this.updateWindowSize);
    }

    componentWillUnmount() {
      window.removeEventListener('resize', this.updateWindowSize);
    }

    updateWindowSize = () => this.setState(getState());

    render() {
      return <Wrapped {...this.state} {...this.props} />;
    }
  };

export default browserShell;
