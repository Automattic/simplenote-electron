import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import MenuBar from '../menu-bar';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchField from '../search-field';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import SortOrderSelector from '../sort-order-selector';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(() =>
  import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

const NotePreview = React.lazy(() =>
  import(/* webpackChunkName: 'note-preview' */ '../components/note-preview')
);

type StateProps = {
  hasRevisions: boolean;
  isFocusMode: boolean;
  isNavigationOpen: boolean;
  isNoteInfoOpen: boolean;
  isNoteOpen: boolean;
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  keyboardShortcutsAreOpen: boolean;
  openedNote: T.EntityId | null;
  openedRevision: number | null;
  showNoteList: boolean;
  showRevisions: boolean;
  showSortBar: boolean;
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
    const { ctrlKey, metaKey } = event;
    const key = event.key.toLowerCase();

    const cmdOrCtrl = ctrlKey || metaKey;

    if (cmdOrCtrl && key === '/') {
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
      hasRevisions,
      isFocusMode = false,
      isNavigationOpen,
      isNoteInfoOpen,
      isNoteOpen,
      isSmallScreen,
      openedNote,
      openedRevision,
      showRevisions,
      showSortBar,
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
            <MenuBar />
            <SearchField />
            <NoteList />
            {showSortBar && <SortOrderSelector />}
          </div>
          {editorVisible && (
            <div className="app-layout__note-column theme-color-bg theme-color-fg theme-color-border">
              {hasRevisions && <RevisionSelector />}
              <NoteToolbar />
              {showRevisions ? (
                <NotePreview noteId={openedNote} note={openedRevision} />
              ) : (
                <NoteEditor />
              )}
            </div>
          )}
        </Suspense>
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  hasRevisions:
    state.ui.showRevisions && state.data.noteRevisions.has(state.ui.openedNote),
  keyboardShortcutsAreOpen: state.ui.dialogs.includes('KEYBINDINGS'),
  keyboardShortcuts: state.settings.keyboardShortcuts,
  isFocusMode: state.settings.focusModeEnabled,
  isNavigationOpen: state.ui.showNavigation,
  isNoteInfoOpen: state.ui.showNoteInfo,
  isNoteOpen: !state.ui.showNoteList,
  isSmallScreen: selectors.isSmallScreen(state),
  openedRevision:
    state.ui.openedRevision?.[0] === state.ui.openedNote
      ? state.data.noteRevisions
          .get(state.ui.openedNote)
          ?.get(state.ui.openedRevision?.[1]) ?? null
      : null,
  openedNote: state.ui.openedNote,
  showNoteList: state.ui.showNoteList,
  showRevisions: state.ui.showRevisions,
  showSortBar: state.ui.filteredNotes.length > 0,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
