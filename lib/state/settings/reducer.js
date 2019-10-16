import { clamp } from 'lodash';

export const initialState = {
  accountName: null,
  autoHideMenuBar: false,
  focusModeEnabled: false,
  fontSize: 16,
  lineLength: 'narrow',
  markdownEnabled: false,
  noteDisplay: 'comfy',
  sortReversed: false,
  sortTagsAlpha: false,
  sortType: 'modificationDate',
  spellCheckEnabled: true,
  theme: 'system',
  wpToken: false,
};

function reducer(state = initialState, action) {
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
    case 'setMarkdownEnabled':
      return { ...state, markdownEnabled: action.markdownEnabled };
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
}

export default reducer;
