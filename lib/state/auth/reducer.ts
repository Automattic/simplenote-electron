import { combineReducers } from 'redux';

import * as A from '../action-types';
import { AuthState } from './constants';

export const authStatus: A.Reducer<AuthState> = (
  state = 'not-authorized',
  action
) => ('AUTH_SET' === action.type ? action.status : state);

export default combineReducers({
  authStatus,
});
