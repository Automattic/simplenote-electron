import './utils/ensure-platform-support';

import { parse } from 'cookie';

import analytics from './analytics';
import getConfig from '../get-config';
import { boot as bootWithoutAuth } from './boot-without-auth';
import { boot as bootLoggingOut } from './logging-out';

const config = getConfig();

const clearStorage = () =>
  new Promise((resolve) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('lastSyncedTime');
    localStorage.removeItem('localQueue:note');
    localStorage.removeItem('localQueue:preferences');
    localStorage.removeItem('localQueue:tag');
    localStorage.removeItem('stored_user');
    indexedDB.deleteDatabase('ghost');
    indexedDB.deleteDatabase('simplenote');
    window.electron?.send('clearCookies');

    // let everything settle
    setTimeout(() => resolve(), 500);
  });

const forceReload = () => history.go();

const loadAccount = () => {
  const storedUserData = localStorage.getItem('stored_user');
  if (!storedUserData) {
    return [null, null];
  }

  try {
    const storedUser = JSON.parse(storedUserData);
    return [storedUser.accessToken, storedUser.username];
  } catch (e) {
    return [null, null];
  }
};

const saveAccount = (accessToken: string, username: string): void => {
  localStorage.setItem(
    'stored_user',
    JSON.stringify({ accessToken, username })
  );
};

const getStoredAccount = () => {
  const [storedToken, storedUsername] = loadAccount();

  // App Engine gets preference if it sends authentication details
  const cookie = parse(document.cookie);
  if (config.is_app_engine && cookie?.token && cookie?.email) {
    if (cookie.email !== storedUsername) {
      clearStorage();
      saveAccount(cookie.token, cookie.email);
    }
    return [cookie.token, cookie.email];
  }

  if (storedToken) {
    return [storedToken, storedUsername];
  }

  const accessToken = localStorage.getItem('access_token');
  if (accessToken) {
    return [accessToken, null];
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
  createWelcomeNote: boolean
) => {
  if (token) {
    import('./boot-with-auth').then(({ bootWithToken }) => {
      bootWithToken(
        () => {
          bootLoggingOut();
          analytics.tracks.recordEvent('user_signed_out');
          clearStorage().then(() => {
            if (window.webConfig?.signout) {
              window.webConfig.signout(forceReload);
            } else {
              forceReload();
            }
          });
        },
        token,
        username,
        createWelcomeNote
      );
    });
  } else {
    bootWithoutAuth(
      (token: string, username: string, createWelcomeNote: boolean) => {
        saveAccount(token, username);
        analytics.tracks.recordEvent('user_signed_in');
        run(token, username, createWelcomeNote);
      }
    );
  }
};

run(storedToken, storedUsername, false);
