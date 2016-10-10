import { get } from 'lodash';

import {
	Authorized,
	Authorizing,
} from './constants';

export const authIsPending = state =>
	Authorizing === get( state, 'auth.authStatus' );

export const isAuthorized = state =>
	Authorized === get( state, 'auth.authStatus' );
