import actions from '../actions';

import * as S from '../';

export const middleware: S.Middleware = ({ dispatch, getState }) => {
  window.electron.receive('appCommand', (command) => {
    switch (command.action) {
      case 'emptyTrash':
        dispatch(actions.ui.emptyTrash());
        return;

      case 'exportNotes':
        dispatch(actions.data.exportNotes());
        return;

      case 'logout':
        dispatch({ type: 'LOGOUT' });
        return;

      case 'printNote':
        window.print();
        return;

      case 'activateTheme':
        dispatch(actions.settings.activateTheme(command.theme));
        return;

      case 'focusSearchField':
        dispatch(actions.ui.focusSearchField());
        return;

      case 'showDialog':
        dispatch(actions.ui.showDialog(command.dialog));
        return;

      case 'trashNote':
        dispatch(actions.ui.trashOpenNote());
        return;

      case 'newNote':
        dispatch(actions.ui.createNote());
        return;

      case 'increaseFontSize':
        dispatch(actions.settings.increaseFontSize());
        return;

      case 'decreaseFontSize':
        dispatch(actions.settings.decreaseFontSize());
        return;

      case 'resetFontSize':
        dispatch(actions.settings.resetFontSize());
        return;

      case 'setLineLength':
        dispatch(actions.settings.setLineLength(command.lineLength));
        return;

      case 'setNoteDisplay':
        dispatch(actions.settings.setNoteDisplay(command.noteDisplay));
        return;

      case 'setSortType':
        dispatch(actions.settings.setSortType(command.sortType));
        return;

      case 'toggleFocusMode':
        dispatch(actions.settings.toggleFocusMode());
        return;

      case 'toggleSortOrder':
        dispatch(actions.settings.toggleSortOrder());
        return;

      case 'toggleSortTagsAlpha':
        dispatch(actions.settings.toggleSortTagsAlpha());
        return;

      case 'toggleSpellCheck':
        dispatch(actions.settings.toggleSpellCheck());
        return;

      default:
        console.log(command);
    }
  });

  window.electron.send('settingsUpdate', getState().settings);

  return (next) => (action) => {
    const prevState = getState();
    const result = next(action);
    const nextState = getState();

    if (prevState.settings !== nextState.settings) {
      window.electron.send('settingsUpdate', nextState.settings);
    }

    return result;
  };
};

export default middleware;
