import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import 'focus-visible/dist/focus-visible.js';
import browserShell from './browser-shell';
import NoteInfo from './note-info';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import DevBadge from './components/dev-badge';
import DialogRenderer from './dialog-renderer';
import { getIpcRenderer } from './utils/electron';
import exportZipArchive from './utils/export';
import { isElectron, isMac } from './utils/platform';
import analytics from './analytics';
import classNames from 'classnames';
import { get } from 'lodash';

import actions from './state/actions';
import * as S from './state';
import * as T from './types';

const ipc = getIpcRenderer();

type OwnProps = {
  isDevConfig: boolean;
  isSmallScreen: boolean;
};

type StateProps = {
  note: T.NoteEntity | null;
  settings: S.State['settings'];
  showNavigation: boolean;
  showNoteInfo: boolean;
  systemTheme: T.Theme;
};

export type DispatchProps = {
  createNote: () => any;
  focusSearchField: () => any;
  openTagList: () => any;
  showDialog: (type: T.DialogType) => any;
  toggleFocusMode: () => any;
  trashNote: (noteId: T.EntityId) => any;
};

export type Props = OwnProps & StateProps & DispatchProps;

export class App extends Component<Props> {
  static displayName = 'App';

  UNSAFE_componentWillMount() {
    if (isElectron) {
      this.initializeElectron();
    }
  }

  componentDidMount() {
    ipc.on('appCommand', this.onAppCommand);
    ipc.send('setAutoHideMenuBar', this.props.settings.autoHideMenuBar);
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
    const { code, ctrlKey, metaKey, shiftKey } = event;

    // Is either cmd or ctrl pressed? (But not both)
    const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

    // open tag list
    if (
      cmdOrCtrl &&
      shiftKey &&
      'KeyT' === code &&
      !this.props.showNavigation
    ) {
      this.props.openTagList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && !shiftKey && 'KeyF' === code) {
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

    if (cmdOrCtrl && shiftKey && 'KeyN' === code) {
      this.props.createNote();
      analytics.tracks.recordEvent('list_note_created');

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (this.props.note?.id && cmdOrCtrl && 'Delete' === code) {
      this.props.trashNote(this.props.note!.id);

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
    if ('exportZipArchive' === get(command, 'action')) {
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

    if ('trashNote' === command.action && this.props.ui.note) {
      return this.props.trashNote(this.props.ui.note.id);
    }

    throw new Error(`command.action: ${command.action}`);
  };

  getTheme = () => {
    const {
      settings: { theme },
      systemTheme,
    } = this.props;
    return 'system' === theme ? systemTheme : theme;
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
      isSmallScreen,
      settings,
      showNavigation,
      showNoteInfo,
    } = this.props;

    const themeClass = `theme-${this.getTheme()}`;

    const appClasses = classNames('app', themeClass, {
      'is-line-length-full': settings.lineLength === 'full',
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
          <AppLayout
            isFocusMode={settings.focusModeEnabled}
            isNavigationOpen={showNavigation}
            isNoteInfoOpen={showNoteInfo}
            isSmallScreen={isSmallScreen}
          />
          {showNoteInfo && <NoteInfo />}
        </div>
        <DialogRenderer appProps={this.props} themeClass={themeClass} />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  note: state.ui.note,
  settings: state.settings,
  showNavigation: state.ui.showNavigation,
  showNoteInfo: state.ui.showNoteInfo,
  systemTheme: state.settings.theme,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => {
  return {
    createNote: () => {
      throw new Error('new note');
    },
    focusSearchField: () => dispatch(actions.ui.focusSearchField()),
    openTagList: () => dispatch(actions.ui.toggleNavigation()),
    showDialog: (dialog) => dispatch(actions.ui.showDialog(dialog)),
    toggleFocusMode: () => dispatch(actions.settings.toggleFocusMode()),
    trashNote: (noteId: T.EntityId) => dispatch(actions.ui.trashNote()),
  };
};

export default browserShell(connect(mapStateToProps, mapDispatchToProps)(App));
