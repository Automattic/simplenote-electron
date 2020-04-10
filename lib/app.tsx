import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import 'focus-visible/dist/focus-visible.js';
import appState from './flux/app-state';
import { loadTags } from './state/domain/tags';
import reduxActions from './state/actions';
import selectors from './state/selectors';
import browserShell from './browser-shell';
import NoteInfo from './note-info';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import Auth from './auth';
import DevBadge from './components/dev-badge';
import DialogRenderer from './dialog-renderer';
import { getIpcRenderer } from './utils/electron';
import exportZipArchive from './utils/export';
import { activityHooks, getUnsyncedNoteIds, nudgeUnsynced } from './utils/sync';
import { setLastSyncedTime } from './utils/sync/last-synced-time';
import analytics from './analytics';
import classNames from 'classnames';
import {
  debounce,
  get,
  has,
  isObject,
  matchesProperty,
  overEvery,
  pick,
  values,
} from 'lodash';
import {
  createNote,
  closeNote,
  setUnsyncedNoteIds,
  toggleNavigation,
  toggleSimperiumConnectionStatus,
} from './state/ui/actions';

import * as settingsActions from './state/settings/actions';

import actions from './state/actions';
import * as S from './state';
import * as T from './types';

const ipc = getIpcRenderer();

export type OwnProps = {
  noteBucket: object;
};

export type DispatchProps = {
  createNote: () => any;
  closeNote: () => any;
  focusSearchField: () => any;
  selectNote: (note: T.NoteEntity) => any;
  showDialog: () => any;
};

export type Props = DispatchProps;

const mapStateToProps = state => ({
  ...state,
  authIsPending: selectors.auth.authIsPending(state),
  isAuthorized: selectors.auth.isAuthorized(state),
});

const mapDispatchToProps: S.MapDispatch<
  DispatchProps,
  OwnProps
> = function mapDispatchToProps(dispatch, { noteBucket }) {
  const actionCreators = Object.assign({}, appState.actionCreators);

  const thenReloadNotes = action => a => {
    dispatch(action(a));
    dispatch(actionCreators.loadNotes({ noteBucket }));
  };

  const thenReloadTags = action => a => {
    dispatch(action(a));
    dispatch(loadTags());
  };

  return {
    actions: bindActionCreators(actionCreators, dispatch),
    ...bindActionCreators(
      pick(settingsActions, [
        'activateTheme',
        'decreaseFontSize',
        'increaseFontSize',
        'resetFontSize',
        'setLineLength',
        'setNoteDisplay',
        'setAccountName',
        'toggleAutoHideMenuBar',
        'toggleFocusMode',
        'toggleSpellCheck',
      ]),
      dispatch
    ),
    closeNote: () => dispatch(closeNote()),
    remoteNoteUpdate: (noteId, data) =>
      dispatch(actions.simperium.remoteNoteUpdate(noteId, data)),
    loadTags: () => dispatch(loadTags()),
    setSortType: thenReloadNotes(settingsActions.setSortType),
    toggleSortOrder: thenReloadNotes(settingsActions.toggleSortOrder),
    toggleSortTagsAlpha: thenReloadTags(settingsActions.toggleSortTagsAlpha),
    createNote: () => dispatch(createNote()),
    openTagList: () => dispatch(toggleNavigation()),
    resetAuth: () => dispatch(reduxActions.auth.reset()),
    selectNote: (note: T.NoteEntity) => dispatch(actions.ui.selectNote(note)),
    setAuthorized: () => dispatch(reduxActions.auth.setAuthorized()),
    focusSearchField: () => dispatch(actions.ui.focusSearchField()),
    setSimperiumConnectionStatus: connected =>
      dispatch(toggleSimperiumConnectionStatus(connected)),
    selectNote: note => dispatch(actions.ui.selectNote(note)),
    setUnsyncedNoteIds: noteIds => dispatch(setUnsyncedNoteIds(noteIds)),
    showDialog: dialog => dispatch(actions.ui.showDialog(dialog)),
  };
};

const isElectron = (() => {
  // https://github.com/atom/electron/issues/2288
  const foundElectron = has(window, 'process.type');

  return () => foundElectron;
})();

const isElectronMac = () =>
  matchesProperty('process.platform', 'darwin')(window);

export const App = connect(
  mapStateToProps,
  mapDispatchToProps
)(
  class extends Component<Props> {
    static displayName = 'App';

    static propTypes = {
      actions: PropTypes.object.isRequired,
      appState: PropTypes.object.isRequired,
      authIsPending: PropTypes.bool.isRequired,
      authorizeUserWithToken: PropTypes.func.isRequired,
      client: PropTypes.object.isRequired,
      isAuthorized: PropTypes.bool.isRequired,
      isDevConfig: PropTypes.bool.isRequired,
      isSmallScreen: PropTypes.bool.isRequired,
      loadTags: PropTypes.func.isRequired,
      onAuthenticate: PropTypes.func.isRequired,
      onCreateUser: PropTypes.func.isRequired,
      openTagList: PropTypes.func.isRequired,
      onSignOut: PropTypes.func.isRequired,
      settings: PropTypes.object.isRequired,
      preferencesBucket: PropTypes.object.isRequired,
      resetAuth: PropTypes.func.isRequired,
      setAuthorized: PropTypes.func.isRequired,
      systemTheme: PropTypes.string.isRequired,
      tagBucket: PropTypes.object.isRequired,
    };

    static defaultProps = {
      onAuthenticate: () => {},
      onCreateUser: () => {},
      onSignOut: () => {},
    };

    UNSAFE_componentWillMount() {
      if (isElectron()) {
        this.initializeElectron();
      }

      this.onAuthChanged();
    }

    componentDidMount() {
      ipc.on('appCommand', this.onAppCommand);
      ipc.send('setAutoHideMenuBar', this.props.settings.autoHideMenuBar);
      ipc.send('settingsUpdate', this.props.settings);

      this.props.noteBucket
        .on('index', this.onNotesIndex)
        .on('update', this.onNoteUpdate)
        .on('update', debounce(this.onNotesIndex, 200, { maxWait: 1000 })) // refresh notes list
        .on('remove', this.onNoteRemoved)
        .beforeNetworkChange(noteId =>
          this.props.actions.onNoteBeforeRemoteUpdate({
            noteId,
          })
        );

      const { preferencesBucket } = this.props;
      preferencesBucket.on('index', () => {
        debugger;
        preferencesBucket.get('preferences-key', (error, preferences) => {
          console.log('foo');
          if (error || !preferences.data.hasOwnProperty('analytics_enabled')) {
            return;
          }

          this.props.remotePreferencesUpdate(
            preferences.data.analytics_enabled
          );
        });
      });

      preferencesBucket.on('update', (entityId, data) => {
        if (
          'preferences-key' !== entityId ||
          !data.hasOwnProperty('analytics_enabled')
        ) {
          return;
        }

        this.props.remotePreferencesUpdate(data.analytics_enabled);
      });

      this.props.tagBucket
        .on('index', this.props.loadTags)
        .on('update', debounce(this.props.loadTags, 200))
        .on('remove', this.props.loadTags);

      this.props.client
        .on('authorized', this.onAuthChanged)
        .on('unauthorized', this.onAuthChanged)
        .on('message', setLastSyncedTime)
        .on('message', this.syncActivityHooks)
        .on('send', this.syncActivityHooks)
        .on('connect', () => this.props.setSimperiumConnectionStatus(true))
        .on('disconnect', () => this.props.setSimperiumConnectionStatus(false));

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

    handleShortcut = event => {
      const { ctrlKey, key, metaKey } = event;

      // Is either cmd or ctrl pressed? (But not both)
      const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

      // open tag list
      if (
        cmdOrCtrl &&
        't' === key.toLowerCase() &&
        !this.props.showNavigation
      ) {
        this.props.openTagList();

        event.stopPropagation();
        event.preventDefault();
        return false;
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

      const canRun = overEvery(
        isObject,
        o => o.action !== null,
        o => has(this.props.actions, o.action) || has(this.props, o.action)
      );

      if (canRun(command)) {
        // newNote expects a bucket to be passed in, but the action method itself wouldn't do that
        if (command.action === 'newNote') {
          this.props.createNote();
          this.props.actions.newNote({
            noteBucket: this.props.noteBucket,
          });
          analytics.tracks.recordEvent('list_note_created');
        } else if (has(this.props, command.action)) {
          const { action, ...args } = command;

          this.props[action](...values(args));
        } else {
          this.props.actions[command.action](command);
        }
      }
    };

    onAuthChanged = () => {
      const {
        actions,
        appState: { accountName },
        client,
        resetAuth,
        setAuthorized,
      } = this.props;

      actions.authChanged();

      if (!client.isAuthorized()) {
        this.props.closeNote();
        return resetAuth();
      }

      setAuthorized();
      analytics.initialize(accountName);

      // 'Kick' the app to ensure content is loaded after signing in
      this.onNotesIndex();
      this.props.loadTags();
    };

    onNotesIndex = () => {
      const { noteBucket, setUnsyncedNoteIds } = this.props;
      const { loadNotes } = this.props.actions;

      loadNotes({ noteBucket });
      setUnsyncedNoteIds(getUnsyncedNoteIds(noteBucket));

      __TEST__ && window.testEvents.push('notesLoaded');
    };

    onNoteRemoved = () => this.onNotesIndex();

    onNoteUpdate = (
      noteId: T.EntityId,
      data,
      remoteUpdateInfo: { patch?: object } = {}
    ) => {
      const {
        noteBucket,
        selectNote,
        ui: { note },
      } = this.props;

      this.props.remoteNoteUpdate(noteId, data);

      if (note && noteId === note.id) {
        noteBucket.get(noteId, (e: unknown, storedNote: T.NoteEntity) => {
          if (e) {
            return;
          }
          const updatedNote = remoteUpdateInfo.patch
            ? { ...storedNote, hasRemoteUpdate: true }
            : storedNote;
          selectNote(updatedNote);
        });
      }
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

    onUpdateContent = (note, content, sync = false) => {
      if (!note) {
        return;
      }

      const updatedNote = {
        ...note,
        data: {
          ...note.data,
          content,
          modificationDate: Math.floor(Date.now() / 1000),
        },
      };

      this.props.selectNote(updatedNote);

      const { noteBucket } = this.props;
      noteBucket.update(note.id, updatedNote.data, {}, { sync });
      if (sync) {
        this.syncNote(note.id);
      }
    };

    syncNote = noteId => {
      this.props.noteBucket.touch(noteId);
    };

    // gets the index of the note located before the currently selected one
    getPreviousNoteIndex = note => {
      const previousIndex = this.props.ui.filteredNotes.findIndex(
        ({ id }) => note.id === id
      );

      return Math.max(previousIndex - 1, 0);
    };

    syncActivityHooks = data => {
      activityHooks(data, {
        onIdle: () => {
          const {
            appState: { notes },
            client,
            noteBucket,
            setUnsyncedNoteIds,
          } = this.props;

          nudgeUnsynced({ client, noteBucket, notes });
          setUnsyncedNoteIds(getUnsyncedNoteIds(noteBucket));
        },
      });
    };

    toggleShortcuts = doEnable => {
      if (doEnable) {
        window.addEventListener('keydown', this.handleShortcut, true);
      } else {
        window.removeEventListener('keydown', this.handleShortcut, true);
      }
    };

    render() {
      const {
        appState: state,
        authIsPending,
        isAuthorized,
        isDevConfig,
        noteBucket,
        preferencesBucket,
        settings,
        tagBucket,
        isSmallScreen,
        ui: { showNavigation, showNoteInfo },
      } = this.props;
      const isMacApp = isElectronMac();

      const themeClass = `theme-${this.getTheme()}`;

      const appClasses = classNames('app', themeClass, {
        'is-line-length-full': settings.lineLength === 'full',
        'touch-enabled': 'ontouchstart' in document.body,
      });

      const mainClasses = classNames('simplenote-app', {
        'note-info-open': showNoteInfo,
        'navigation-open': showNavigation,
        'is-electron': isElectron(),
        'is-macos': isMacApp,
      });

      return (
        <div className={appClasses}>
          {isDevConfig && <DevBadge />}
          {isAuthorized ? (
            <div className={mainClasses}>
              {showNavigation && <NavigationBar isElectron={isElectron()} />}
              <AppLayout
                isFocusMode={settings.focusModeEnabled}
                isNavigationOpen={showNavigation}
                isNoteInfoOpen={showNoteInfo}
                isSmallScreen={isSmallScreen}
                noteBucket={noteBucket}
                onUpdateContent={this.onUpdateContent}
                syncNote={this.syncNote}
              />
              {showNoteInfo && <NoteInfo noteBucket={noteBucket} />}
            </div>
          ) : (
            <Auth
              authPending={authIsPending}
              isAuthenticated={isAuthorized}
              onAuthenticate={this.props.onAuthenticate}
              onCreateUser={this.props.onCreateUser}
              authorizeUserWithToken={this.props.authorizeUserWithToken}
              isMacApp={isMacApp}
              isElectron={isElectron()}
            />
          )}
          <DialogRenderer
            appProps={this.props}
            buckets={{ noteBucket, preferencesBucket, tagBucket }}
            themeClass={themeClass}
            isElectron={isElectron()}
            isMacApp={isMacApp}
          />
        </div>
      );
    }
  }
);

export default browserShell(App);
