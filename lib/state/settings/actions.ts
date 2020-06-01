import { getIpcRenderer } from '../../utils/electron';

import * as A from '../action-types';
import { WindowScroller } from 'react-virtualized';

export const setFontSize: A.ActionCreator<A.SetFontSize> = (
  fontSize?: number
) => ({
  type: 'setFontSize',
  fontSize,
});

export const increaseFontSize = () => (dispatch, getState) => {
  const {
    settings: { fontSize },
  } = getState();

  dispatch(setFontSize(fontSize + 1));
};

export const decreaseFontSize = () => (dispatch, getState) => {
  const {
    settings: { fontSize },
  } = getState();

  dispatch(setFontSize(fontSize - 1));
};

export const resetFontSize: A.ActionCreator<A.SetFontSize> = () =>
  setFontSize(undefined);

export const activateTheme: A.ActionCreator<A.SetTheme> = (theme) => ({
  type: 'setTheme',
  theme,
});

export const setNoteDisplay: A.ActionCreator<A.SetNoteDisplay> = (
  noteDisplay
) => ({
  type: 'setNoteDisplay',
  noteDisplay,
});

export const setLineLength: A.ActionCreator<A.SetLineLength> = (
  lineLength
) => ({
  type: 'setLineLength',
  lineLength,
});

export const toggleKeyboardShortcuts: A.ActionCreator<A.ToggleKeyboardShortcuts> = () => ({
  type: 'KEYBOARD_SHORTCUTS_TOGGLE',
});

export const toggleSortOrder = () => (dispatch, getState) => {
  dispatch({
    type: 'setSortReversed',
    sortReversed: !getState().settings.sortReversed,
  });
};

export const setSortType: A.ActionCreator<A.SetSortType> = (sortType) => ({
  type: 'setSortType',
  sortType,
});

export const toggleSortTagsAlpha = () => (dispatch, getState) => {
  dispatch({
    type: 'setSortTagsAlpha',
    sortTagsAlpha: !getState().settings.sortTagsAlpha,
  });
};

export const setAccountName: A.ActionCreator<A.SetAccountName> = (
  accountName
) => ({
  type: 'setAccountName',
  accountName,
});

export const toggleFocusMode = () => (dispatch, getState) => {
  dispatch({
    type: 'setFocusMode',
    focusModeEnabled: !getState().settings.focusModeEnabled,
  });
};

export const toggleSpellCheck = () => (dispatch, getState) => {
  dispatch({
    type: 'setSpellCheck',
    spellCheckEnabled: !getState().settings.spellCheckEnabled,
  });
};

export const toggleAutoHideMenuBar = () => (dispatch, getState) => {
  const newValue = !getState().settings.autoHideMenuBar;

  window.electron.send('setAutoHideMenuBar', newValue);

  dispatch({
    type: 'setAutoHideMenuBar',
    autoHideMenuBar: newValue,
  });
};
