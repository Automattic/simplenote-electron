import { TKQItem, TracksAPI } from './analytics/types';

declare global {
  const __TEST__: boolean;

  interface Window {
    analyticsEnabled: boolean;
    location: string;
    testEvents: (string | [string, ...any[]])[];
    _tkq: TKQItem[] & { a: unknown };
    webConfig?: {
      signout?: Function;
    };
    wpcom: {
      tracks: TracksAPI;
    };
  }

  const window: Window;

  // provided by webpack define plugin
  // see webpack.config.js
  const config: {
    app_engine_url: string;
    is_app_engine: boolean;
  };
}
