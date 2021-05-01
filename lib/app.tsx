import React, { Component } from 'react';
import { connect } from 'react-redux';
import 'focus-visible/dist/focus-visible.js';
import NoteInfo from './note-info';
import NoteActions from './note-actions';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import DevBadge from './components/dev-badge';
import DialogRenderer from './dialog-renderer';
import EmailVerification from './email-verification';
import AlternateLoginPrompt from './alternate-login-prompt';
import { isElectron, isMac } from './utils/platform';
import classNames from 'classnames';
import {
  createNote,
  closeNote,
  search,
  toggleNavigation,
} from './state/ui/actions';
import { recordEvent } from './state/analytics/middleware';

import * as settingsActions from './state/settings/actions';

import actions from './state/actions';
import * as selectors from './state/selectors';
import * as S from './state';
import * as T from './types';

type OwnProps = {
  isDevConfig: boolean;
};

type StateProps = {
  autoHideMenuBar: boolean;
  hotkeysEnabled: boolean;
  isSmallScreen: boolean;
  lineLength: T.LineLength;
  isSearchActive: boolean;
  showAlternateLoginPrompt: boolean;
  showEmailVerification: boolean;
  showNavigation: boolean;
  showNoteActions: boolean;
  showNoteInfo: boolean;
  showRevisions: boolean;
  theme: 'light' | 'dark';
};

type DispatchProps = {
  clearSearch: () => any;
  closeNote: () => any;
  createNote: () => any;
  focusSearchField: () => any;
  setLineLength: (length: T.LineLength) => any;
  setNoteDisplay: (displayMode: T.ListDisplayMode) => any;
  setSortType: (sortType: T.SortType) => any;
  toggleAutoHideMenuBar: () => any;
  toggleFocusMode: () => any;
  toggleSortOrder: () => any;
  toggleSortTagsAlpha: () => any;
  toggleSpellCheck: () => any;
  toggleTagList: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

class AppComponent extends Component<Props> {
  static displayName = 'App';

  componentDidMount() {
    window.electron?.send('setAutoHideMenuBar', this.props.autoHideMenuBar);
    document.body.dataset.theme = this.props.theme;

    this.toggleShortcuts(true);

    recordEvent('application_opened');
    __TEST__ && window.testEvents.push('booted');
  }

  componentDidUpdate() {
    document.body.dataset.theme = this.props.theme;
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
    delete document.body.dataset.theme;
  }

  handleShortcut = (event: KeyboardEvent) => {
    const { hotkeysEnabled } = this.props;
    const shouldHandleBrowserShortcuts = !window.electron;

    // Handle search shortcuts even if keyboard shortcuts are disabled.
    if (shouldHandleBrowserShortcuts) {
      this.handleBrowserSearchShortcut(event);
    }

    if (!hotkeysEnabled) {
      return;
    }
    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();

    // Is either cmd or ctrl pressed? (But not both)
    const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

    // open tag list
    if (cmdOrCtrl && shiftKey && 'u' === key) {
      this.props.toggleTagList();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (('Escape' === key || 'Esc' === key) && this.props.isSearchActive) {
      this.props.clearSearch();
    }

    if (shouldHandleBrowserShortcuts) {
      this.handleBrowserShortcut(event);
    }

    return true;
  };

  // handle all keyboard shortcuts that are duplicated in the Electron menus
  // this listener is only called in browsers, as otherwise the
  // menu will trigger them via the provided Accelerator, so we don't need a listener
  handleBrowserShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();

    // Is either cmd or ctrl pressed? (But not both)
    const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

    if (cmdOrCtrl && shiftKey && 'i' === key) {
      this.props.createNote();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    if (cmdOrCtrl && shiftKey && 'f' === key) {
      this.props.toggleFocusMode();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }
  };

  handleBrowserSearchShortcut = (event: KeyboardEvent) => {
    const { ctrlKey, metaKey, shiftKey } = event;
    const key = event.key.toLowerCase();

    // Is either cmd or ctrl pressed? (But not both)
    const cmdOrCtrl = (ctrlKey || metaKey) && ctrlKey !== metaKey;

    if (
      (cmdOrCtrl && shiftKey && 's' === key) ||
      (cmdOrCtrl && !shiftKey && 'f' === key)
    ) {
      this.props.focusSearchField();

      event.stopPropagation();
      event.preventDefault();
      return false;
    }

    // prevent default browser behavior for search and find
    if (cmdOrCtrl && ('g' === key || 'f' === key)) {
      event.stopPropagation();
      event.preventDefault();
    }
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
      showAlternateLoginPrompt,
      showEmailVerification,
      showNavigation,
      showNoteActions,
      showNoteInfo,
      showRevisions,
      theme,
    } = this.props;

    const appClasses = classNames('app', {
      'is-line-length-full': lineLength === 'full',
      'touch-enabled': 'ontouchstart' in document.body,
    });

    const mainClasses = classNames('simplenote-app', {
      'navigation-open': showNavigation,
      'is-electron': isElectron,
      'is-macos': isElectron && isMac,
    });

    return (
      <div className={appClasses}>
        {showEmailVerification && <EmailVerification />}
        {showAlternateLoginPrompt && <AlternateLoginPrompt />}
        {isDevConfig && (
          <DevBadge
            aria-hidden={showNavigation || showRevisions ? true : undefined}
          />
        )}
        <div className={mainClasses}>
          {showNavigation && <NavigationBar />}
          <AppLayout />
          {showNoteInfo && <NoteInfo />}
          {showNoteActions && <NoteActions />}
        </div>
        <DialogRenderer appProps={this.props} />
      </div>
    );
  }
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  autoHideMenuBar: state.settings.autoHideMenuBar,
  hotkeysEnabled: state.settings.keyboardShortcuts,
  isSearchActive: !!state.ui.searchQuery.length,
  isSmallScreen: selectors.isSmallScreen(state),
  lineLength: state.settings.lineLength,
  showAlternateLoginPrompt: state.ui.showAlternateLoginPrompt,
  showEmailVerification: selectors.shouldShowEmailVerification(state),
  showNavigation: state.ui.showNavigation,
  showNoteActions: state.ui.showNoteActions,
  showNoteInfo: state.ui.showNoteInfo,
  showRevisions: state.ui.showRevisions,
  theme: selectors.getTheme(state),
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = (dispatch) => {
  return {
    activateTheme: (theme: T.Theme) =>
      dispatch(settingsActions.activateTheme(theme)),
    clearSearch: () => dispatch(search('')),
    closeNote: () => dispatch(closeNote()),
    createNote: () => dispatch(createNote()),
    focusSearchField: () => dispatch(actions.ui.focusSearchField()),
    setLineLength: (length) => dispatch(settingsActions.setLineLength(length)),
    setNoteDisplay: (displayMode) =>
      dispatch(settingsActions.setNoteDisplay(displayMode)),
    setSortType: (sortType) => dispatch(settingsActions.setSortType(sortType)),
    toggleAutoHideMenuBar: () =>
      dispatch(settingsActions.toggleAutoHideMenuBar()),
    toggleFocusMode: () => dispatch(settingsActions.toggleFocusMode()),
    toggleSortOrder: () => dispatch(settingsActions.toggleSortOrder()),
    toggleSortTagsAlpha: () => dispatch(settingsActions.toggleSortTagsAlpha()),
    toggleSpellCheck: () => dispatch(settingsActions.toggleSpellCheck()),
    toggleTagList: () => dispatch(toggleNavigation()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AppComponent);
