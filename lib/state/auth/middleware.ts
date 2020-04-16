import * as A from '../action-types';
import * as S from '../';

export const middleware: S.Middleware = store => {
  return next => (action: A.ActionType) => {
    const result = next(action);
    const nextState = store.getState();

    switch (action.type) {
      case 'AUTH_SET':
        if (action.status === 'not-authorized') {
          if (isElectron) {
            const ipcRenderer = __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
            ipcRenderer.send('clearCookies');
          }
        }

        break;
    }
    return result;
  };
};

export default middleware;
