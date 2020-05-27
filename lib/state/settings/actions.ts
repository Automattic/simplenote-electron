import { getIpcRenderer } from '../../utils/electron';

import * as A from '../action-types';
import * as T from '../../types';

const ipc = getIpcRenderer();

export const setFontSize: A.ActionCreator<A.SetFontSize> = (
  fontSize?: number
) => ({
  type: 'setFontSize',
  fontSize,
});

export const increaseFontSize: A.ActionCreator<A.IncreaseFontSize> = () => ({
  type: 'INCREASE_FONT_SIZE',
});

export const decreaseFontSize: A.ActionCreator<A.DecreaseFontSize> = () => ({
  type: 'DECREASE_FONT_SIZE',
});

export const resetFontSize: A.ActionCreator<A.ResetFontSize> = () => ({
  type: 'RESET_FONT_SIZE',
});

export const activateTheme: A.ActionCreator<A.SetTheme> = (theme: T.Theme) => ({
  type: 'setTheme',
  theme,
});

export const setNoteDisplay: A.ActionCreator<A.SetNoteDisplay> = (
  noteDisplay: T.ListDisplayMode
) => ({
  type: 'setNoteDisplay',
  noteDisplay,
});

export const setLineLength: A.ActionCreator<A.SetLineLength> = (
  lineLength: T.LineLength
) => ({
  type: 'setLineLength',
  lineLength,
});

export const toggleKeyboardShortcuts: A.ActionCreator<A.ToggleKeyboardShortcuts> = () => ({
  type: 'KEYBOARD_SHORTCUTS_TOGGLE',
});

export const toggleSortOrder: A.ActionCreator<A.ToggleSortOrder> = () => ({
  type: 'TOGGLE_SORT_ORDER',
});

export const setSortType: A.ActionCreator<A.SetSortType> = (
  sortType: T.SortType
) => ({
  type: 'setSortType',
  sortType,
});

export const toggleSortTagsAlpha: A.ActionCreator<A.ToggleSortTagsAlpha> = () => ({
  type: 'TOGGLE_SORT_TAGS_ALPHA',
});

export const setAccountName: A.ActionCreator<A.SetAccountName> = (
  accountName: string
) => ({
  type: 'setAccountName',
  accountName,
});

export const toggleFocusMode: A.ActionCreator<A.ToggleFocusMode> = () => ({
  type: 'TOGGLE_FOCUS_MODE',
});

export const toggleSpellCheck: A.ActionCreator<A.ToggleSpellcheck> = () => ({
  type: 'TOGGLE_SPELLCHECK',
});

export const toggleAutoHideMenuBar: A.ActionCreator<A.ToggleAutoHideMenuBar> = () => ({
  type: 'TOGGLE_AUTO_HIDE_MENU_BAR',
});
