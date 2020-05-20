import { combineReducers } from 'redux';

import * as A from '../action-types';
import * as S from '../';

///////////////////////////////////////
////  HELPERS
///////////////////////////////////////

const getTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getWidth = () => window.innerWidth;

///////////////////////////////////////
////  REDUCERS
///////////////////////////////////////

const systemTheme: A.Reducer<'light' | 'dark'> = (state = getTheme(), action) =>
  action.type === 'SYSTEM_THEME_UPDATE' ? action.prefers : state;

const windowWidth: A.Reducer<number> = (state = getWidth(), action) =>
  action.type === 'WINDOW_RESIZE' ? action.innerWidth : state;

///////////////////////////////////////
////  COMBINED
///////////////////////////////////////

export const reducer = combineReducers({
  windowWidth,
  systemTheme,
});

export const middleware: S.Middleware = ({ dispatch }) => {
  window.addEventListener('resize', () =>
    dispatch({
      type: 'WINDOW_RESIZE',
      innerWidth: getWidth(),
    })
  );

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () =>
      dispatch({
        type: 'SYSTEM_THEME_UPDATE',
        prefers: getTheme(),
      })
    );

  return (next) => next;
};
