export const Authorized = Symbol();
export const Authorizing = Symbol();
export const InvalidCredentials = Symbol();
export const LoginError = Symbol();
export const NotAuthorized = Symbol();

export type AuthState =
  | typeof Authorized
  | typeof Authorizing
  | typeof InvalidCredentials
  | typeof LoginError
  | typeof NotAuthorized;
