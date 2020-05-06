import { clamp } from 'lodash';

import * as A from '../action-types';
import * as T from '../../types';

export const initialState = {
  accountName: null as string | null,
  autoHideMenuBar: false,
  focusModeEnabled: false,
  fontSize: 16,
  lineLength: 'narrow' as T.LineLength,
  markdownEnabled: false,
  noteDisplay: 'comfy' as T.ListDisplayMode,
  sortReversed: false,
  sortTagsAlpha: false,
  sortType: 'modificationDate' as T.SortType,
  spellCheckEnabled: true,
  theme: 'system' as T.Theme,
  wpToken: false as string | boolean,
};

const reducer: A.Reducer<typeof initialState> = (
  state = initialState,
  action
) => {
  switch (action.type) {
    case 'setAccountName':
      return { ...state, accountName: action.accountName };
    case 'setAutoHideMenuBar':
      return { ...state, autoHideMenuBar: action.autoHideMenuBar };
    case 'setFocusMode':
      return { ...state, focusModeEnabled: action.focusModeEnabled };
    case 'setFontSize':
      return {
        ...state,
        fontSize: clamp(action.fontSize || initialState.fontSize, 10, 30),
      };
    case 'setLineLength':
      return { ...state, lineLength: action.lineLength };
    case 'SET_SYSTEM_TAG':
      return 'markdown' === action.tagName
        ? { ...state, markdownEnabled: action.shouldHaveTag }
        : state;
    case 'setNoteDisplay':
      return { ...state, noteDisplay: action.noteDisplay };
    case 'setSortReversed':
      return { ...state, sortReversed: action.sortReversed };
    case 'setSortTagsAlpha':
      return { ...state, sortTagsAlpha: action.sortTagsAlpha };
    case 'setSortType':
      return { ...state, sortType: action.sortType };
    case 'setSpellCheck':
      return { ...state, spellCheckEnabled: action.spellCheckEnabled };
    case 'setTheme':
      return { ...state, theme: action.theme };
    case 'setWPToken':
      return { ...state, wpToken: action.token };
    default:
      return state;
  }
};

export default reducer;
