import React, { Component } from 'react';
import { connect } from 'react-redux';
import 'focus-visible/dist/focus-visible.js';
import NoteInfo from './note-info';
import NavigationBar from './navigation-bar';
import AppLayout from './app-layout';
import DevBadge from './components/dev-badge';
import DialogRenderer from './dialog-renderer';
import { isElectron, isMac } from './utils/platform';
import classNames from 'classnames';
import { createNote, closeNote, toggleNavigation } from './state/ui/actions';
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
  showNavigation: boolean;
  showNoteInfo: boolean;
  theme: 'light' | 'dark';
};

type DispatchProps = {
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

    this.toggleShortcuts(true);

    recordEvent('application_opened');
    __TEST__ && window.testEvents.push('booted');
  }

  componentWillUnmount() {
    this.toggleShortcuts(false);
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
    if (cmdOrCtrl && shiftKey && 'KeyU' === code) {
      this.props.toggleTagList();

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
