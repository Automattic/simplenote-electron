import { TKQItem, TracksAPI } from './analytics/types';

declare global {
  const __TEST__: boolean;
  function __non_webpack_require__(
    moduleName: 'electron'
  ): {
    ipcRenderer: {
      send(command: 'clearCookies'): void;
      send(command: 'setAutoHideMenuBar', newValue: boolean);
    };
  };

  interface Window {
    analyticsEnabled: boolean;
    location: Location;
    testEvents: (string | [string, ...any[]])[];
    _tkq: TKQItem[] & { a: unknown };
    webConfig?: {
      signout?: (callback: () => void) => void;
    };
    wpcom: {
      tracks: TracksAPI;
    };
  }
}
