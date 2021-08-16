import './utils/ensure-platform-support';

import { parse } from 'cookie';

import getConfig from '../get-config';
import { boot as bootWithoutAuth } from './boot-without-auth';
import { boot as bootLoggingOut } from './logging-out';
import { isElectron } from './utils/platform';

const config = getConfig();

const clearStorage = (): Promise<void> =>
  new Promise((resolveStorage) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('lastSyncedTime');
    localStorage.removeItem('localQueue:note');
    localStorage.removeItem('localQueue:preferences');
    localStorage.removeItem('localQueue:tag');
    localStorage.removeItem('stored_user');
    localStorage.removeItem('note_positions');
    window.electron?.send('appStateUpdate', {});

    const settings = localStorage.getItem('simpleNote');
    if (settings) {
      try {
        const { accountName, ...otherSettings } = JSON.parse(settings);
        localStorage.setItem('simpleNote', JSON.stringify(otherSettings));
      } catch (e) {
        // pass - we only care if we can successfully do this,
        //        not if we fail to do it
      }
    }

    Promise.all([
      new Promise((resolve) => {
        const r = indexedDB.deleteDatabase('ghost');
        r.onupgradeneeded = resolve;
        r.onblocked = resolve;
        r.onsuccess = resolve;
        r.onerror = resolve;
      }),
      new Promise((resolve) => {
        const r = indexedDB.deleteDatabase('simplenote');
        r.onupgradeneeded = resolve;
        r.onblocked = resolve;
        r.onsuccess = resolve;
        r.onerror = resolve;
      }),
      new Promise((resolve) => {
        const r = indexedDB.deleteDatabase('simplenote_v2');
        r.onupgradeneeded = resolve;
        r.onblocked = resolve;
        r.onsuccess = resolve;
        r.onerror = resolve;
      }),
    ])
      .then(() => {
        window.electron?.send('clearCookies');
        resolveStorage();
      })
      .catch(() => resolveStorage());
  });

const forceReload = () => {
  if (isElectron) {
    window.electron?.send('reload');
  } else {
    window.history.go();
  }
};

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

const ensureNormalization = () =>
  !('normalize' in String.prototype)
    ? import(/* webpackChunkName: 'unorm' */ 'unorm')
    : Promise.resolve();

// @TODO: Move this into some framework spot
// still no IE support
// https://tc39.github.io/ecma262/#sec-array.prototype.findindex
/* eslint-disable */
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function (predicate: Function) {
      // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    },
    configurable: true,
    writable: true,
  });
}
/* eslint-enable */

const run = (token: string | null, username: string | null) => {
  if (token) {
    Promise.all([
      ensureNormalization(),
      import(/* webpackChunkName: 'boot-with-auth' */ './boot-with-auth'),
    ]).then(([unormPolyfillLoaded, { bootWithToken }]) => {
      bootWithToken(
        () => {
          bootLoggingOut();
          clearStorage().then(() => {
            if (window.webConfig?.signout) {
              window.webConfig.signout(forceReload);
            } else {
              forceReload();
            }
          });
        },
        token,
        username
      );
    });
  } else {
    window.addEventListener('storage', (event) => {
      if (event.key === 'stored_user') {
        forceReload();
      }
    });
    bootWithoutAuth((token: string, username: string) => {
      saveAccount(token, username);
      run(token, username);
    });
  }
};

run(storedToken, storedUsername);
