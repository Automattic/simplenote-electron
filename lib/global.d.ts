import { TKQItem, TracksAPI } from './analytics/types';
import { compose } from 'redux';

import * as S from './state';

type ElectronAPI = {
  confirmLogout: (changes: string) => 'export' | 'reconsider' | 'logout';
  send: (channel: string, data?: unknown) => void;
  receive: (channel: string, callback: (data: any) => void) => void;
  removeListener: (channel: string) => void;
  isMac: boolean;
  isLinux: boolean;
};

declare global {
  const __TEST__: boolean;
  const config: {
    app_engine_url: string;
    app_id: string;
    app_key: string;
    development: boolean;
    is_app_engine: string;
    version: string;
    wpcc_client_id: string;
    wpcc_redirect_url: string;
  };

  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    analyticsEnabled: boolean;
    electron: ElectronAPI;
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
