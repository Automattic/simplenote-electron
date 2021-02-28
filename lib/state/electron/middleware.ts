import debugFactory from 'debug';

import actions from '../actions';

import * as S from '../';

const debug = debugFactory('electron-middleware');

export const middleware: S.Middleware = ({ dispatch, getState }) => {
  window.electron.receive('appCommand', (command) => {
    switch (command.action) {
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

      case 'setHiddenTags':
        dispatch(actions.settings.setHiddenTags(command.hiddenTags));
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
