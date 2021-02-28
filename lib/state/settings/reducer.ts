import { combineReducers } from 'redux';

import * as A from '../action-types';
import * as T from '../../types';

const accountName: A.Reducer<string | null> = (state = null, action) => {
  switch (action.type) {
    case 'setAccountName':
      return action.accountName;
    default:
      return state;
  }
};

const autoHideMenuBar: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'setAutoHideMenuBar':
      return action.autoHideMenuBar;
    case 'TOGGLE_AUTO_HIDE_MENU_BAR':
      return !state;
    default:
      return state;
  }
};

const focusModeEnabled: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'setFocusMode':
      return action.focusModeEnabled;
    case 'TOGGLE_FOCUS_MODE':
      return !state;
    default:
      return state;
  }
};

const keyboardShortcuts: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'KEYBOARD_SHORTCUTS_TOGGLE':
      return !state;
    default:
      return state;
  }
};

const lineLength: A.Reducer<T.LineLength> = (state = 'narrow', action) => {
  switch (action.type) {
    case 'setLineLength':
      return action.lineLength;
    default:
      return state;
  }
};

const hiddenTags: A.Reducer<T.HiddenTags> = (state = [], action) => {
  switch (action.type) {
    case 'setHiddenTags':
      return action.hiddenTags;
    default:
      return state;
  }
};

const markdownEnabled: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'SET_SYSTEM_TAG':
      if ('markdown' === action.tagName) {
        return action.shouldHaveTag;
      }
      return state;
    default:
      return state;
  }
};

const noteDisplay: A.Reducer<T.ListDisplayMode> = (state = 'comfy', action) => {
  switch (action.type) {
    case 'setNoteDisplay':
      return action.noteDisplay;
    default:
      return state;
  }
};

const sendNotifications: A.Reducer<boolean> = (
  state = window.Notification?.permission === 'granted',
  action
) => {
  switch (action.type) {
    case 'REQUEST_NOTIFICATIONS':
      return action.sendNotifications
        ? window.Notification?.permission === 'granted'
        : false;

    default:
      return state && window.Notification?.permission === 'granted';
  }
};

const sortReversed: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'setSortReversed':
      return action.sortReversed;
    case 'setSortType':
      return typeof action.sortReversed !== 'undefined'
        ? action.sortReversed
        : state;
    case 'TOGGLE_SORT_ORDER':
      return !state;
    default:
      return state;
  }
};

const sortTagsAlpha: A.Reducer<boolean> = (state = false, action) => {
  switch (action.type) {
    case 'setSortTagsAlpha':
      return action.sortTagsAlpha;
    case 'TOGGLE_SORT_TAGS_ALPHA':
      return !state;
    default:
      return state;
  }
};
const sortType: A.Reducer<T.SortType> = (
  state = 'modificationDate',
  action
) => {
  switch (action.type) {
    case 'setSortType':
      return action.sortType;
    default:
      return state;
  }
};
const spellCheckEnabled: A.Reducer<boolean> = (state = true, action) => {
  switch (action.type) {
    case 'setSpellCheck':
      return action.spellCheckEnabled;
    case 'TOGGLE_SPELLCHECK':
      return !state;
    default:
      return state;
  }
};

const theme: A.Reducer<T.Theme> = (state = 'system', action) => {
  switch (action.type) {
    case 'setTheme':
      return action.theme;
    default:
      return state;
  }
};

export default combineReducers({
  accountName,
  autoHideMenuBar,
  focusModeEnabled,
  hiddenTags,
  keyboardShortcuts,
  lineLength,
  markdownEnabled,
  noteDisplay,
  sendNotifications,
  sortReversed,
  sortTagsAlpha,
  sortType,
  spellCheckEnabled,
  theme,
});
