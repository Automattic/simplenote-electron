import debugFactory from 'debug';

import actions from '../actions';

import * as S from '../';

const debug = debugFactory('electron-middleware');

export const middleware: S.Middleware = ({ dispatch, getState }) => {
  window.electron.receive('tokenLogin', (url) => {
    const { searchParams } = new URL(url);
    const tokenEmail = searchParams.get('email');
    // if already logged in with the same account as the token, do nothing
    if (tokenEmail !== getState().settings.accountName) {
      dispatch(actions.ui.showAlternateLoginPrompt(tokenEmail));
    }
  });

  window.electron.receive('appCommand', (command) => {
    switch (command.action) {
      case 'systemTheme':
        dispatch({ type: 'SYSTEM_THEME_UPDATE', prefers: command.theme });
        return;

      case 'closeWindow':
        dispatch(actions.ui.closeWindow());
        return;

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
        debug(`unknown AppCommand: ${command}`);
    }
  });

  window.electron.send('appStateUpdate', {
    settings: getState().settings,
    editMode: getState().ui.editMode,
  });

  return (next) => (action) => {
    const prevState = getState();
    const result = next(action);
    const nextState = getState();

    switch (action.type) {
      case 'REALLY_CLOSE_WINDOW':
        window.electron.send('reallyCloseWindow');
        return result;
    }

    if (
      prevState.settings !== nextState.settings ||
      prevState.ui.editMode !== nextState.ui.editMode
    ) {
      window.electron.send('appStateUpdate', {
        settings: nextState.settings,
        editMode: nextState.ui.editMode,
      });
    }

    return result;
  };
};

export default middleware;
