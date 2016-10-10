import { AUTH_SET } from '../action-types';

import {
	Authorized,
	Authorizing,
	NotAuthorized,
} from './constants';

export const reset = () => ( {
	type: AUTH_SET,
	status: NotAuthorized,
} );

export const setPending = () => ( {
	type: AUTH_SET,
	status: Authorizing,
} );

export const setAuthorized = () => ( {
	type: AUTH_SET,
	status: Authorized,
} );
