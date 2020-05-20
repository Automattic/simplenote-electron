import * as S from './';

/**
 * "Narrow" views hide the note editor
 *
 * @see _variables.scss for 750 constant as $single-column value
 */
export const isSmallScreen: S.Selector<boolean> = (state) =>
  state.browser.windowWidth <= 750;

export const getTheme: S.Selector<'light' | 'dark'> = (state) =>
  state.settings.theme === 'system'
    ? state.browser.systemTheme
    : state.settings.theme;
