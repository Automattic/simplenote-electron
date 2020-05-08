import React, { Component } from 'react';
import { render } from 'react-dom';

import '../scss/style.scss';

class LoggingOut extends Component {
  render() {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light';

    return (
      <div className={`app theme-${systemTheme}`}>
        <div
          style={{
            fontSize: '18px',
            margin: 'auto',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: '-50% -50%',
          }}
        >
          Logging out…
        </div>
      </div>
    );
  }
}

export const boot = () => {
  render(<LoggingOut />, document.getElementById('root'));
};
