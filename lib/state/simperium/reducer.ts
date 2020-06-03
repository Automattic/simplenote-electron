import { combineReducers } from 'redux';

import * as A from '../action-types';
import * as T from '../../types';

const connectionStatus: A.Reducer<T.ConnectionState> = (
  state = 'red',
  action
) => (action.type === 'CHANGE_CONNECTION_STATUS' ? action.status : state);

export default combineReducers({
  connectionStatus,
});
