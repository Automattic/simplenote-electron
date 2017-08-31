import { difference, union } from 'lodash';
import { combineReducers } from 'redux';
import { TAG_DRAWER_TOGGLE } from '../action-types';

const defaultVisiblePanes = ['editor', 'noteList'];

const visiblePanes = (state = defaultVisiblePanes, { type, show }) => {
  if (TAG_DRAWER_TOGGLE === type) {
    return show
      ? union(state, ['tagDrawer'])
      : difference(state, ['tagDrawer']);
  }

  return state;
};

export default combineReducers({ visiblePanes });
