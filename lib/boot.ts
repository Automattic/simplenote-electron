import './utils/ensure-platform-support';

import { parse } from 'cookie';

import { boot as bootWithoutAuth } from './boot-without-auth';

const cookie = parse(document.cookie);
const storedToken = cookie?.token ?? localStorage.getItem('access_token');
const storedUsername = config.is_app_engine
  ? cookie?.email
  : localStorage.getItem('username');

if (config.is_app_engine && !storedToken) {
  window.webConfig?.signout?.(() => {
    window.location = `${config.app_engine_url}/`;
  });
}

const run = (
  token: string,
  username: string | null,
  createWelcomeNote: false
) => {
  if (token) {
    import('./boot-with-auth').then(({ bootWithToken }) => {
      bootWithToken(
        () => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('username');
          run('', '', false);
        },
        token,
        username,
        createWelcomeNote
      );
    });
  } else {
    bootWithoutAuth(
      (token: string, username: string, createWelcomeNote: boolean) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('username', username);
        run(token, username, false);
      }
    );
  }
};

run(storedToken, storedUsername, false);
