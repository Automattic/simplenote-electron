import React, { Component } from 'react';
import { getAppRoot } from './app-root';

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
            alignSelf: 'center',
            margin: '0 auto',
          }}
        >
          Logging out…
        </div>
      </div>
    );
  }
}

export const boot = () => {
  getAppRoot().render(<LoggingOut />);
};
