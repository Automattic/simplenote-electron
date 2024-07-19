import { TKQItem, TracksAPI } from './analytics/types';
import { compose } from 'redux';

import * as S from './state';

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
    electron: {
      confirmLogout(changes: string): 'logout' | 'reconsider' | 'export';
      isMac: boolean;
      isLinux: boolean;
      receive(command: 'appCommand', callback: (event: any) => any);
      receive(command: 'editorCommand', callback: (event: any) => any);
      receive(command: 'noteImportChannel', callback: (event: any) => any);
      receive(command: 'tokenLogin', callback: (event: any) => any);
      receive(command: 'wpLogin', callback: (event: any) => any);
      removeListener(command: 'editorCommand');
      removeListener(command: 'noteImportChannel');
      send(
        command: 'appStateUpdate',
        args: {
          settings: S.State['settings'];
          editMode: boolean;
        }
      );
      send(command: 'clearCookies'): void;
      send(command: 'importNotes', filePath: string);
      send(command: 'reallyCloseWindow'): void;
      send(command: 'reload');
      send(command: 'setAutoHideMenuBar', newValue: boolean);
      send(command: 'wpLogin', url: string);
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
