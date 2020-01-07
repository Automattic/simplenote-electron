import * as A from '../action-types';

import {
  Authorized,
  Authorizing,
  InvalidCredentials,
  LoginError,
  NotAuthorized,
} from './constants';

export const reset = (): A.AuthSet => ({
  type: 'AUTH_SET',
  status: NotAuthorized,
});

export const setInvalidCredentials = (): A.AuthSet => ({
  type: 'AUTH_SET',
  status: InvalidCredentials,
});

export const setLoginError = (): A.AuthSet => ({
  type: 'AUTH_SET',
  status: LoginError,
});

export const setPending = (): A.AuthSet => ({
  type: 'AUTH_SET',
  status: Authorizing,
});

export const setAuthorized = (): A.AuthSet => ({
  type: 'AUTH_SET',
  status: Authorized,
});
