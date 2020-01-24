import * as A from '../action-types';

export const reset: A.ActionCreator<A.SetAuth> = () => ({
  type: 'AUTH_SET',
  status: 'not-authorized',
});

export const setInvalidCredentials: A.ActionCreator<A.SetAuth> = () => ({
  type: 'AUTH_SET',
  status: 'invalid-credentials',
});

export const setLoginError: A.ActionCreator<A.SetAuth> = () => ({
  type: 'AUTH_SET',
  status: 'login-error',
});

export const setPending: A.ActionCreator<A.SetAuth> = () => ({
  type: 'AUTH_SET',
  status: 'authorizing',
});

export const setAuthorized: A.ActionCreator<A.SetAuth> = () => ({
  type: 'AUTH_SET',
  status: 'authorized',
});
