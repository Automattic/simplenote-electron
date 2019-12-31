import React, { Component } from 'react';

/**
 * Get window-related attributes
 *
 * There is no need for `this` here; `window` is global
 *
 * @returns {{windowWidth: Number, isSmallScreen: boolean, systemTheme: String }}
 * window attributes
 */
const getState = () => {
  const windowWidth = window.innerWidth;

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  return {
    windowWidth,
    isSmallScreen: windowWidth <= 750, // Magic number here corresponds to $single-column value in variables.scss
    systemTheme,
  };
};

/**
 * Passes window-related attributes into child component
 *
 * Passes:
 *   - viewport width (including scrollbar)
 *   - whether width is considered small
 *   - system @media theme (dark or light)
 *
 * @param {Element} Wrapped React component dependent on window attributes
 * @returns {Component} wrapped React component with window attributes as props
 */
export const browserShell = Wrapped =>
  class extends Component {
    static displayName = 'BrowserShell';

    state = getState();

    componentDidMount() {
      window.addEventListener('resize', this.updateWindowSize);
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addListener(this.updateSystemTheme);
    }

    componentWillUnmount() {
      window.removeEventListener('resize', this.updateWindowSize);
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .removeListener(this.updateSystemTheme);
    }

    updateWindowSize = () => this.setState(getState());
    updateSystemTheme = () => this.setState(getState());

    render() {
      return <Wrapped {...this.state} {...this.props} />;
    }
  };

export default browserShell;
