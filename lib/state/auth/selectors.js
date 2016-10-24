import { get } from 'lodash';

import {
	Authorized,
	Authorizing,
	InvalidCredentials,
	LoginError,
} from './constants';

export const authIsPending = state =>
	Authorizing === get( state, 'auth.authStatus' );

export const hasInvalidCredentials = state =>
	InvalidCredentials === get( state, 'auth.authStatus' );

export const hasLoginError = state =>
	LoginError === get( state, 'auth.authStatus' );

export const isAuthorized = state =>
	Authorized === get( state, 'auth.authStatus' );
