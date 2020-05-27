import React, { Component } from 'react';
import { connect } from 'react-redux';
import 'focus-visible/dist/focus-visible.js';
import NoteInfo from './note-info';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import DevBadge from './components/dev-badge';
import DialogRenderer from './dialog-renderer';
import { getIpcRenderer } from './utils/electron';
import exportZipArchive from './utils/export';
import { isElectron, isMac } from './utils/platform';
import classNames from 'classnames';
import { createNote, closeNote, toggleNavigation } from './state/ui/actions';

import * as settingsActions from './state/settings/actions';

import actions from './state/actions';
import * as selectors from './state/selectors';
import * as S from './state';
import * as T from './types';

const ipc = getIpcRenderer();

type OwnProps = {
  isDevConfig: boolean;
};

type StateProps = {
  autoHideMenuBar: boolean;
  hotkeysEnabled: boolean;
  isSmallScreen: boolean;
  lineLength: T.LineLength;
  showNavigation: boolean;
  showNoteInfo: boolean;
  theme: 'light' | 'dark';
};

type DispatchProps = {
  closeNote: () => any;
  createNote: () => any;
  decreaseFontSize: () => any;
  focusSearchField: () => any;
  increaseFontSize: () => any;
  openTagList: () => any;
  resetFontSize: () => any;
  selectNote: (note: T.NoteEntity) => any;
  setAccountName: (name: string) => any;
  setLineLength: (length: T.LineLength) => any;
  setNoteDisplay: (displayMode: T.ListDisplayMode) => any;
  setSortType: (sortType: T.SortType) => any;
  showDialog: (type: T.DialogType) => any;
  toggleAutoHideMenuBar: () => any;
  toggleFocusMode: () => any;
  toggleSortOrder: () => any;
  toggleSortTagsAlpha: () => any;
  toggleSpellCheck: () => any;
  trashNote: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

class AppComponent extends Component<Props> {
  static displayName = 'App';

  UNSAFE_componentWillMount() {
    if (isElectron) {
      this.initializeElectron();
    }
  }

  componentDidMount() {
    ipc.on('appCommand', this.onAppCommand);
    ipc.send('setAutoHideMenuBar', this.props.autoHideMenuBar);
    ipc.send('settingsUpdate', this.props.settings);

    this.toggleShortcuts(true);

    __TEST__ && window.testEvents.push('booted');
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);

    ipc.removeListener('appCommand', this.onAppCommand);
  }

  componentDidUpdate(prevProps) {
    const { settings } = this.props;

    if (settings !== prevProps.settings) {
      ipc.send('settingsUpdate', settings);
    }
  }

  handleShortcut = (event: KeyboardEvent) => {
    const { hotkeysEnabled } = this.props;
    if (!hotkeysEnabled) {
      return;
    }
    const { code, ctrlKey, metaKey, shiftKey } = event;

    // Is either cmd or ctrl pressed? (But not both)
    const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

    // open tag list
    if (
      cmdOrCtrl &&
      shiftKey &&
      'KeyU' === code &&
      !this.props.showNavigation
    ) {
      this.props.openTagList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (
      (cmdOrCtrl && shiftKey && 'KeyS' === code) ||
      (isElectron && cmdOrCtrl && !shiftKey && 'KeyF' === code)
    ) {
      this.props.focusSearchField();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && 'KeyF' === code) {
      this.props.toggleFocusMode();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && 'KeyI' === code) {
      this.props.createNote();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // prevent default browser behavior for search
    // will bubble up from note-detail
    if (cmdOrCtrl && 'KeyG' === code) {
      event.stopPropagation();
      event.preventDefault();
    }

    return true;
  };

  onAppCommand = (event, command) => {
    if ('exportZipArchive' === command.action) {
      exportZipArchive();
    }

    if ('printNote' === command.action) {
      return window.print();
    }

    if ('focusSearchField' === command.action) {
      return this.props.focusSearchField();
    }

    if ('showDialog' === command.action) {
      return this.props.showDialog(command.dialog);
    }

    if ('trashNote' === command.action) {
      return this.props.trashNote();
    }

    if ('newNote' === command.action) {
      return this.props.createNote();
    }

    console.log(command.action);
  };

  initializeElectron = () => {
    const { remote } = __non_webpack_require__('electron'); // eslint-disable-line no-undef

    this.setState({
      electron: {
        currentWindow: remote.getCurrentWindow(),
        Menu: remote.Menu,
      },
    });
  };

  toggleShortcuts = (doEnable: boolean) => {
    if (doEnable) {
      window.addEventListener('keydown', this.handleShortcut, true);
    } else {
      window.removeEventListener('keydown', this.handleShortcut, true);
    }
  };

  render() {
    const {
      isDevConfig,
      lineLength,
      showNavigation,
      showNoteInfo,
      theme,
    } = this.props;

    const appClasses = classNames('app', `theme-${theme}`, {
      'is-line-length-full': lineLength === 'full',
      'touch-enabled': 'ontouchstart' in document.body,
    });

    const mainClasses = classNames('simplenote-app', {
      'note-info-open': showNoteInfo,
      'navigation-open': showNavigation,
      'is-electron': isElectron,
      'is-macos': isMac,
    });

    return (
      <div className={appClasses}>
        {isDevConfig && <DevBadge />}
        <div className={mainClasses}>
          {showNavigation && <NavigationBar />}
          <AppLayout />
          {showNoteInfo && <NoteInfo />}
        </div>
        <DialogRenderer appProps={this.props} />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  autoHideMenuBar: state.settings.autoHideMenuBar,
  hotkeysEnabled: state.settings.keyboardShortcuts,
  isSmallScreen: selectors.isSmallScreen(state),
  lineLength: state.settings.lineLength,
  showNavigation: state.ui.showNavigation,
  showNoteInfo: state.ui.showNoteInfo,
  theme: selectors.getTheme(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => {
  return {
    activateTheme: (theme: T.Theme) =>
      dispatch(settingsActions.activateTheme(theme)),
    closeNote: () => dispatch(closeNote()),
    createNote: () => dispatch(createNote()),
    decreaseFontSize: () => dispatch(settingsActions.decreaseFontSize()),
    focusSearchField: () => dispatch(actions.ui.focusSearchField()),
    increaseFontSize: () => dispatch(settingsActions.increaseFontSize()),
    openTagList: () => dispatch(toggleNavigation()),
    resetFontSize: () => dispatch(settingsActions.resetFontSize()),
    selectNote: (note: T.NoteEntity) => dispatch(actions.ui.selectNote(note)),
    setAccountName: (name) => dispatch(settingsActions.setAccountName(name)),
    setLineLength: (length) => dispatch(settingsActions.setLineLength(length)),
    setNoteDisplay: (displayMode) =>
      dispatch(settingsActions.setNoteDisplay(displayMode)),
    setSortType: (sortType) => dispatch(settingsActions.setSortType(sortType)),
    showDialog: (dialog) => dispatch(actions.ui.showDialog(dialog)),
    toggleAutoHideMenuBar: () =>
      dispatch(settingsActions.toggleAutoHideMenuBar()),
    toggleFocusMode: () => dispatch(settingsActions.toggleFocusMode()),
    toggleSortOrder: () => dispatch(settingsActions.toggleSortOrder()),
    toggleSortTagsAlpha: () => dispatch(settingsActions.toggleSortTagsAlpha()),
    toggleSpellCheck: () => dispatch(settingsActions.toggleSpellCheck()),
    trashNote: () => dispatch(actions.ui.trashNote()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AppComponent);
