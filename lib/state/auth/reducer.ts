import { combineReducers } from 'redux';

import * as A from '../action-types';

import { AuthState, NotAuthorized } from './constants';

export const authStatus: A.Reducer<AuthState> = (
  state = NotAuthorized,
  action
) => (action.type === 'AUTH_SET' ? action.status : state);

export default combineReducers({
  authStatus,
});
