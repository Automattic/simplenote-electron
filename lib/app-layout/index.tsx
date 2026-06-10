import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import MenuBar from '../menu-bar';
import NoteToolbar from '../note-toolbar';
import SearchField from '../search-field';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import NoteRevisions from '../note-revisions';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';
import * as selectors from '../state/selectors';

import * as S from '../state';
import * as T from '../types';

const NoteList = React.lazy(
  () => import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(
  () => import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

type StateProps = {
  isFocusMode: boolean;
  isNavigationOpen: boolean;
  isNoteInfoOpen: boolean;
  isNoteOpen: boolean;
  isSmallScreen: boolean;
  keyboardShortcuts: boolean;
  keyboardShortcutsAreOpen: boolean;
  openedNote: T.EntityId | null;
  openedRevision: T.Note | null;
  showNoteList: boolean;
  showRevisions: boolean;
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
      isFocusMode = false,
      isNavigationOpen,
      isNoteInfoOpen,
      isNoteOpen,
      isSmallScreen,
      openedNote,
      openedRevision,
      showRevisions,
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
      <div
        className={mainClasses}
        aria-hidden={isNavigationOpen ? true : undefined}
      >
        <Suspense fallback={placeholder}>
          <aside aria-label="Notes list" className="app-layout__source-column">
            <MenuBar />
            <SearchField />
            <NoteList />
          </aside>
          {editorVisible && (
            <main aria-label="Note editor" className="app-layout__note-column">
              <NoteToolbar />
              {showRevisions ? (
                <NoteRevisions noteId={openedNote} note={openedRevision} />
              ) : (
                <NoteEditor />
              )}
            </main>
          )}
        </Suspense>
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = (state) => ({
  keyboardShortcutsAreOpen: selectors.isDialogOpen(state, 'KEYBINDINGS'),
  keyboardShortcuts: state.settings.keyboardShortcuts,
  isFocusMode: state.settings.focusModeEnabled,
  isNavigationOpen: state.ui.showNavigation,
  isNoteInfoOpen: state.ui.showNoteInfo,
  isNoteOpen: !state.ui.showNoteList,
  isSmallScreen: selectors.isSmallScreen(state),
  openedRevision:
    state.ui.openedRevision?.[0] === state.ui.openedNote
      ? (state.data.noteRevisions
          .get(state.ui.openedNote)
          ?.get(state.ui.openedRevision?.[1]) ?? null)
      : null,
  openedNote: state.ui.openedNote,
  showNoteList: state.ui.showNoteList,
  showRevisions: state.ui.showRevisions,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
