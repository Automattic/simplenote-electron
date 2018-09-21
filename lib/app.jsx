import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import appState from './flux/app-state';
import reduxActions from './state/actions';
import selectors from './state/selectors';
import browserShell from './browser-shell';
import exportNotes from './utils/export';
import exportToZip from './utils/export/to-zip';
import NoteInfo from './note-info';
import NoteList from './note-list';
import NoteEditor from './note-editor';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import Auth from './auth';
import DialogRenderer from './dialog-renderer';
import analytics from './analytics';
import classNames from 'classnames';
import {
  noop,
  get,
  has,
  isObject,
  matchesProperty,
  overEvery,
  pick,
  values,
} from 'lodash';

import * as settingsActions from './state/settings/actions';

import filterNotes from './utils/filter-notes';
import SearchBar from './search-bar';

// Electron-specific mocks
let ipc = getIpc();
let fs = null;

function getIpc() {
  try {
    return __non_webpack_require__('electron').ipcRenderer; // eslint-disable-line no-undef
  } catch (e) {
    return {
      on: noop,
      removeListener: noop,
      send: noop,
    };
  }
}

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
        'toggleFocusMode',
      ]),
      dispatch
    ),
    setSortType: thenReloadNotes(settingsActions.setSortType),
    toggleSortOrder: thenReloadNotes(settingsActions.toggleSortOrder),

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

  if (foundElectron) {
    fs = __non_webpack_require__('fs'); // eslint-disable-line no-undef
  }

  return () => foundElectron;
})();

const isElectronMac = () =>
  matchesProperty('process.platform', 'darwin')(window);

export const App = connect(mapStateToProps, mapDispatchToProps)(
  class extends Component {
    static displayName = 'App';

    static propTypes = {
      actions: PropTypes.object.isRequired,
      appState: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,

      client: PropTypes.object.isRequired,
      noteBucket: PropTypes.object.isRequired,
      tagBucket: PropTypes.object.isRequired,
      onAuthenticate: PropTypes.func.isRequired,
      onCreateUser: PropTypes.func.isRequired,
      onSignOut: PropTypes.func.isRequired,
      authorizeUserWithToken: PropTypes.func.isRequired,
    };

    static defaultProps = {
      onAuthenticate: () => {},
      onCreateUser: () => {},
      onSignOut: () => {},
    };

    componentWillMount() {
      if (isElectron()) {
        this.initializeElectron();
      }

      this.onAuthChanged();
    }

    componentDidMount() {
      ipc.on('appCommand', this.onAppCommand);
      ipc.send('settingsUpdate', this.props.settings);

      this.props.noteBucket
        .on('index', this.onNotesIndex)
        .on('update', this.onNoteUpdate)
        .on('remove', this.onNoteRemoved);

      this.props.tagBucket
        .on('index', this.onTagsIndex)
        .on('update', this.onTagsIndex)
        .on('remove', this.onTagsIndex);

      this.props.client
        .on('authorized', this.onAuthChanged)
        .on('unauthorized', this.onAuthChanged);

      this.onNotesIndex();
      this.onTagsIndex();

      this.toggleShortcuts(true);

      analytics.tracks.recordEvent('application_opened');
    }

    componentWillUnmount() {
      this.toggleShortcuts(false);

      ipc.removeListener('appCommand', this.onAppCommand);
    }

    componentDidUpdate(prevProps) {
      if (this.props.settings !== prevProps.settings) {
        ipc.send('settingsUpdate', this.props.settings);
      }
    }

    handleShortcut = event => {
      const { ctrlKey, key, metaKey } = event;

      const cmdOrCtrl = ctrlKey || metaKey;

      // open tag list
      if (cmdOrCtrl && 'T' === key && !this.state.showNavigation) {
        this.props.openTagList();

        event.stopPropagation();
        event.preventDefault();
        return false;
      }

      // focus search field
      if (cmdOrCtrl && 'f' === key) {
        this.props.setSearchFocus();

        event.stopPropagation();
        event.preventDefault();
        return false;
      }

      return true;
    };

    onAppCommand = (event, command) => {
      if ('exportZipArchive' === get(command, 'action')) {
        return exportNotes()
          .then(exportToZip)
          .then(zip =>
            zip.generateAsync({
              compression: 'DEFLATE',
              platform: get(window, 'process.platform', 'DOS'),
              type: 'base64',
            })
          )
          .then(blob => fs.writeFile(command.filename, blob, 'base64', noop))
          .catch(console.log); // eslint-disable-line no-console
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
    };

    onNotePrinted = () =>
      this.props.actions.setShouldPrintNote({ shouldPrint: false });

    onNotesIndex = () =>
      this.props.actions.loadNotes({ noteBucket: this.props.noteBucket });

    onNoteRemoved = () => this.onNotesIndex();

    onNoteUpdate = (noteId, data, original, patch, isIndexing) =>
      this.props.actions.noteUpdated({
        noteBucket: this.props.noteBucket,
        noteId,
        data,
        original,
        patch,
        isIndexing,
      });

    onTagsIndex = () =>
      this.props.actions.loadTags({ tagBucket: this.props.tagBucket });

    initializeElectron = () => {
      const remote = __non_webpack_require__('electron').remote; // eslint-disable-line no-undef

      this.setState({
        electron: {
          currentWindow: remote.getCurrentWindow(),
          Menu: remote.Menu,
        },
      });
    };

    onUpdateContent = (note, content) =>
      this.props.actions.updateNoteContent({
        noteBucket: this.props.noteBucket,
        note,
        content,
      });

    onUpdateNoteTags = (note, tags) =>
      this.props.actions.updateNoteTags({
        noteBucket: this.props.noteBucket,
        tagBucket: this.props.tagBucket,
        note,
        tags,
      });

    // gets the index of the note located before the currently selected one
    getPreviousNoteIndex = note => {
      const filteredNotes = filterNotes(this.props.appState);

      const noteIndex = function(filteredNote) {
        return note.id === filteredNote.id;
      };

      return Math.max(filteredNotes.findIndex(noteIndex) - 1, 0);
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
        noteBucket,
        settings,
        tagBucket,
        isSmallScreen,
      } = this.props;
      const isMacApp = isElectronMac();
      const filteredNotes = filterNotes(state);
      const hasNotes = filteredNotes.length > 0;
      const selectedNote =
        state.note || (!isSmallScreen && hasNotes ? filteredNotes[0] : null);
      const isNoteOpen = Boolean(
        (isSmallScreen && state.note) || (!isSmallScreen && selectedNote)
      );

      const appClasses = classNames('app', `theme-${settings.theme}`, {
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
          {isAuthorized ? (
            <div className={mainClasses}>
              {state.showNavigation && (
                <NavigationBar noteBucket={noteBucket} tagBucket={tagBucket} />
              )}
              <AppLayout
                isFocusMode={settings.focusModeEnabled}
                isNavigationOpen={state.showNavigation}
                isNoteOpen={isNoteOpen}
                isNoteInfoOpen={state.showNoteInfo}
                note={selectedNote}
                noteBucket={noteBucket}
                revisions={state.revisions}
                onUpdateContent={this.onUpdateContent}
                searchBar={<SearchBar noteBucket={noteBucket} />}
                noteList={
                  <NoteList
                    noteBucket={noteBucket}
                    isSmallScreen={isSmallScreen}
                  />
                }
                noteEditor={
                  <NoteEditor
                    allTags={state.tags}
                    filter={state.filter}
                    onUpdateNoteTags={this.onUpdateNoteTags}
                    shouldPrint={state.shouldPrint}
                    onNotePrinted={this.onNotePrinted}
                  />
                }
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
            dialogs={this.props.appState.dialogs}
            isElectron={isElectron()}
          />
        </div>
      );
    }
  }
);

export default browserShell(App);
