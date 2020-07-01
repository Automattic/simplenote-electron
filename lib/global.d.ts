import { TKQItem, TracksAPI } from './analytics/types';

import * as S from '../../state';

declare global {
  const __TEST__: boolean;

  interface Window {
    analyticsEnabled: boolean;
    electron: {
      confirmLogout(changes: string): boolean;
      isMac: boolean;
      receive(command: 'appCommand', callback: (event: any) => any);
      send(command: 'clearCookies'): void;
      send(command: 'setAutoHideMenuBar', newValue: boolean);
      send(command: 'settingsUpdate', settings: S.State['settings']);
    };
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
