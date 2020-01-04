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

import * as settingsActions from './state/settings/actions';

const ipc = getIpcRenderer();

const mapStateToProps = state => ({
  ...state,
  authIsPending: selectors.auth.authIsPending(state),
  isAuthorized: selectors.auth.isAuthorized(state),
});

function mapDispatchToProps(dispatch, { noteBucket }) {
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
        'setMarkdown',
        'setAccountName',
        'toggleAutoHideMenuBar',
        'toggleFocusMode',
        'toggleSpellCheck',
      ]),
      dispatch
    ),
    loadTags: () => dispatch(loadTags()),
    setSortType: thenReloadNotes(settingsActions.setSortType),
    toggleSortOrder: thenReloadNotes(settingsActions.toggleSortOrder),
    toggleSortTagsAlpha: thenReloadTags(settingsActions.toggleSortTagsAlpha),

    openTagList: () => dispatch(actionCreators.toggleNavigation()),
    resetAuth: () => dispatch(reduxActions.auth.reset()),
    setAuthorized: () => dispatch(reduxActions.auth.setAuthorized()),
    setSearchFocus: () =>
      dispatch(actionCreators.setSearchFocus({ searchFocus: true })),
  };
}

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
  class extends Component {
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
      noteBucket: PropTypes.object.isRequired,
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

    state = {
      isNoteOpen: false,
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

      this.props.preferencesBucket.on('update', this.onLoadPreferences);

      this.props.tagBucket
        .on('index', this.props.loadTags)
        .on('update', debounce(this.props.loadTags, 200))
        .on('remove', this.props.loadTags);

      const {
        actions: { setConnectionStatus },
      } = this.props;

      this.props.client
        .on('authorized', this.onAuthChanged)
        .on('unauthorized', this.onAuthChanged)
        .on('message', setLastSyncedTime)
        .on('message', this.syncActivityHooks)
        .on('send', this.syncActivityHooks)
        .on('connect', () => setConnectionStatus({ isOffline: false }))
        .on('disconnect', () => setConnectionStatus({ isOffline: true }));

      this.onLoadPreferences(() =>
        // Make sure that tracking starts only after preferences are loaded
        analytics.tracks.recordEvent('application_opened')
      );

      this.toggleShortcuts(true);
    }

    componentWillUnmount() {
      this.toggleShortcuts(false);

      ipc.removeListener('appCommand', this.onAppCommand);
    }

    componentDidUpdate(prevProps) {
      const { settings, isSmallScreen } = this.props;

      if (settings !== prevProps.settings) {
        ipc.send('settingsUpdate', settings);
      }

      // If note has just been loaded
      if (prevProps.appState.note === undefined && this.props.appState.note) {
        this.setState({ isNoteOpen: true });
      }

      if (isSmallScreen !== prevProps.isSmallScreen) {
        this.setState({
          isNoteOpen: Boolean(
            this.props.appState.note &&
              (settings.focusModeEnabled || !isSmallScreen)
          ),
        });
      }
    }

    handleShortcut = event => {
      const { ctrlKey, key, metaKey } = event;

      // Is either cmd or ctrl pressed? (But not both)
      const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

      // open tag list
      if (cmdOrCtrl && 'T' === key && !this.state.showNavigation) {
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

      const canRun = overEvery(
        isObject,
        o => o.action !== null,
        o => has(this.props.actions, o.action) || has(this.props, o.action)
      );

      if (canRun(command)) {
        // newNote expects a bucket to be passed in, but the action method itself wouldn't do that
        if (command.action === 'newNote') {
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
        actions.closeNote();
        return resetAuth();
      }

      setAuthorized();
      analytics.initialize(accountName);
      this.onLoadPreferences();

      // 'Kick' the app to ensure content is loaded after signing in
      this.onNotesIndex();
      this.props.loadTags();
    };

    onNotesIndex = () => {
      const { noteBucket } = this.props;
      const { loadNotes, setUnsyncedNoteIds } = this.props.actions;

      loadNotes({ noteBucket });
      setUnsyncedNoteIds({ noteIds: getUnsyncedNoteIds(noteBucket) });
    };

    onNoteRemoved = () => this.onNotesIndex();

    onNoteUpdate = (noteId, data, remoteUpdateInfo = {}) => {
      if (remoteUpdateInfo.patch) {
        this.props.actions.noteUpdatedRemotely({
          noteBucket: this.props.noteBucket,
          noteId,
          data,
          remoteUpdateInfo,
        });
      }
    };

    onLoadPreferences = callback =>
      this.props.actions.loadPreferences({
        callback,
        preferencesBucket: this.props.preferencesBucket,
      });

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
      const noteIndex = this.props.ui.filteredNotes.findIndex(
        ({ id }) => note.id === id
      );

      return Math.max(noteIndex - 1, 0);
    };

    syncActivityHooks = data => {
      activityHooks(data, {
        onIdle: () => {
          const {
            actions: { setUnsyncedNoteIds },
            appState: { notes },
            client,
            noteBucket,
          } = this.props;

          nudgeUnsynced({ client, noteBucket, notes });
          setUnsyncedNoteIds({
            noteIds: getUnsyncedNoteIds(noteBucket),
          });
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

    loadPreferences = () => {
      this.props.actions.loadPreferences({
        preferencesBucket: this.props.preferencesBucket,
      });
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
      } = this.props;
      const isMacApp = isElectronMac();

      const themeClass = `theme-${this.getTheme()}`;

      const appClasses = classNames('app', themeClass, {
        'is-line-length-full': settings.lineLength === 'full',
        'touch-enabled': 'ontouchstart' in document.body,
      });

      const mainClasses = classNames('simplenote-app', {
        'note-info-open': state.showNoteInfo,
        'navigation-open': state.showNavigation,
        'is-electron': isElectron(),
        'is-macos': isMacApp,
      });

      return (
        <div className={appClasses}>
          {isDevConfig && <DevBadge />}
          {isAuthorized ? (
            <div className={mainClasses}>
              {state.showNavigation && (
                <NavigationBar isElectron={isElectron()} />
              )}
              <AppLayout
                isFocusMode={settings.focusModeEnabled}
                isNavigationOpen={state.showNavigation}
                isNoteOpen={this.state.isNoteOpen}
                isNoteInfoOpen={state.showNoteInfo}
                isSmallScreen={isSmallScreen}
                note={state.note}
                noteBucket={noteBucket}
                revisions={state.revisions}
                onNoteClosed={() => this.setState({ isNoteOpen: false })}
                onNoteOpened={() => this.setState({ isNoteOpen: true })}
                onUpdateContent={this.onUpdateContent}
                syncNote={this.syncNote}
              />
              {state.showNoteInfo && <NoteInfo noteBucket={noteBucket} />}
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
            closeDialog={this.props.actions.closeDialog}
            dialogs={this.props.appState.dialogs}
            isElectron={isElectron()}
            isMacApp={isMacApp}
          />
        </div>
      );
    }
  }
);

export default browserShell(App);
