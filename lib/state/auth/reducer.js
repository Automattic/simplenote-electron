import { combineReducers } from 'redux';

import { AUTH_SET } from '../action-types';

import { NotAuthorized } from './constants';

export const authStatus = ( state = NotAuthorized, { type, status } ) =>
	AUTH_SET === type
		? status
		: state;

export default combineReducers( {
	authStatus,
} );
