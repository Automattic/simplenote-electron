import React, { Component } from 'react';
import { render } from 'react-dom';

import '../scss/style.scss';

class LoggingOut extends Component {
  systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

  componentDidMount() {
    document.body.dataset.theme = this.systemTheme;
  }

  render() {
    return (
      <div className="app">
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
