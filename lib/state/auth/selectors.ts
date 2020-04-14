import * as S from "../";

export const authIsPending = (state: S.State) =>
  "authorizing" === state.auth.authStatus;

export const hasInvalidCredentials = (state: S.State) =>
  "invalid-credentials" === state.auth.authStatus;

export const hasLoginError = (state: S.State) =>
  "login-error" === state.auth.authStatus;

export const isAuthorized = (state: S.State) =>
  "authorized" === state.auth.authStatus;
