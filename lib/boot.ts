import './utils/ensure-platform-support';

import { parse } from 'cookie';

import getConfig from '../get-config';
import { boot as bootWithoutAuth } from './boot-without-auth';
import { isElectron } from './utils/platform';

const config = getConfig();

const getStoredAccount = () => {
  const cookie = parse(document.cookie);
  if (config.is_app_engine && cookie?.token && cookie?.email) {
    return [cookie.token, cookie.email];
  }

  const storedUserData = localStorage.getItem('stored_user');
  if (!storedUserData) {
    return [null, null];
  }

  const storedUser = JSON.parse(storedUserData);
  if (storedUser?.accessToken && storedUser?.username) {
    return [storedUser.accessToken, storedUser.username];
  }

  return [null, null];
};

const [storedToken, storedUsername] = getStoredAccount();

if (config.is_app_engine && !storedToken) {
  window.webConfig?.signout?.(() => {
    window.location = `${config.app_engine_url}/`;
  });
}

const run = (
  token: string | null,
  username: string | null,
  createWelcomeNote: false
) => {
  if (token) {
    import('./boot-with-auth').then(({ bootWithToken }) => {
      bootWithToken(
        () => {
          localStorage.removeItem('stored_user');
          localStorage.removeItem('simpleNote');
          indexedDB.deleteDatabase('ghost');
          indexedDB.deleteDatabase('simplenote');
          if (isElectron) {
            const ipcRenderer = __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
            ipcRenderer.send('clearCookies');
          }

          run(null, null, false);
        },
        token,
        username,
        createWelcomeNote
      );
    });
  } else {
    bootWithoutAuth(
      (token: string, username: string, createWelcomeNote: boolean) => {
        localStorage.setItem(
          'stored_user',
          JSON.stringify({ accessToken: token, username })
        );

        run(token, username, false);
      }
    );
  }
};

run(storedToken, storedUsername, false);
