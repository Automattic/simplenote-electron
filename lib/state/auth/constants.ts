export type AuthState =
  | 'authorized'
  | 'authorizing'
  | 'invalid-credentials'
  | 'login-error'
  | 'not-authorized';
