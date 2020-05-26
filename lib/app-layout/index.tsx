import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(() =>
  import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

type StateProps = {
  isFocusMode: boolean;
  isNavigationOpen: boolean;
  isNoteInfoOpen: boolean;
  isNoteOpen: boolean;
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  keyboardShortcutsAreOpen: boolean;
  showNoteList: boolean;
};

type DispatchProps = {
  hideKeyboardShortcuts: () => any;
  showKeyboardShortcuts: () => any;
};

type Props = StateProps & DispatchProps;

export class AppLayout extends Component<Props> {
  componentDidMount() {
    window.addEventListener('keydown', this.openKeybindingsHelp, false);
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.openKeybindingsHelp, false);
  }

  openKeybindingsHelp = (event: KeyboardEvent) => {
    if (!this.props.keyboardShortcuts) {
      return;
    }
    const {
      hideKeyboardShortcuts,
      keyboardShortcutsAreOpen,
      showKeyboardShortcuts,
    } = this.props;
    const { ctrlKey, code, metaKey } = event;

    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && code === 'Slash') {
      keyboardShortcutsAreOpen
        ? hideKeyboardShortcuts()
        : showKeyboardShortcuts();

      event.stopPropagation();
      event.preventDefault();
    }
  };

  render = () => {
    const {
      showNoteList,
      isFocusMode = false,
      isNavigationOpen,
      isNoteInfoOpen,
      isNoteOpen,
      isSmallScreen,
    } = this.props;

    const mainClasses = classNames('app-layout', {
      'is-focus-mode': isFocusMode,
      'is-navigation-open': isNavigationOpen,
      'is-note-open': isNoteOpen,
      'is-showing-note-info': isNoteInfoOpen,
    });

    const editorVisible = !(showNoteList && isSmallScreen);

    const placeholder = (
      <TransitionDelayEnter delay={1000}>
        <div className="app-layout__placeholder">
          <SimplenoteCompactLogo />
        </div>
      </TransitionDelayEnter>
    );

    return (
      <div className={mainClasses}>
        <Suspense fallback={placeholder}>
          <div className="app-layout__source-column theme-color-bg theme-color-fg">
            <SearchBar />
            <NoteList />
          </div>
          {editorVisible && (
            <div className="app-layout__note-column theme-color-bg theme-color-fg theme-color-border">
              <RevisionSelector />
              <NoteToolbar />
              <NoteEditor />
            </div>
          )}
        </Suspense>
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  keyboardShortcutsAreOpen: state.ui.dialogs.includes('KEYBINDINGS'),
  keyboardShortcuts: state.settings.keyboardShortcuts,
  isFocusMode: state.settings.focusModeEnabled,
  isNavigationOpen: state.ui.showNavigation,
  isNoteInfoOpen: state.ui.showNoteInfo,
  isNoteOpen: !state.ui.showNoteList,
  isSmallScreen: selectors.isSmallScreen(state),
  showNoteList: state.ui.showNoteList,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
