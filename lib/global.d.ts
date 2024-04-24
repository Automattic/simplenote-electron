import { TKQItem, TracksAPI } from './analytics/types';
import { compose } from 'redux';

import * as S from './state';

declare global {
  const __TEST__: boolean;

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
