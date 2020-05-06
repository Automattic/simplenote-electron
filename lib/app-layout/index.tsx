import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';

import * as S from '../state';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(() =>
  import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

type OwnProps = {
  isFocusMode: boolean;
  isNavigationOpen: boolean;
  isNoteInfoOpen: boolean;
  isSmallScreen: boolean;
};

type StateProps = {
  isNoteOpen: boolean;
  keyboardShortcutsAreOpen: boolean;
  showNoteList: boolean;
};

type DispatchProps = {
  hideKeyboardShortcuts: () => any;
  showKeyboardShortcuts: () => any;
};

type Props = OwnProps & StateProps & DispatchProps;

export class AppLayout extends Component<Props> {
  componentDidMount() {
    window.addEventListener('keydown', this.openKeybindingsHelp, false);
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.openKeybindingsHelp, false);
  }

  openKeybindingsHelp = (event: KeyboardEvent) => {
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
            <NoteList isSmallScreen={isSmallScreen} />
          </div>
          {editorVisible && (
            <div className="app-layout__note-column theme-color-bg theme-color-fg theme-color-border">
              <RevisionSelector />
              <NoteToolbar />
              <NoteEditor isSmallScreen={isSmallScreen} />
            </div>
          )}
        </Suspense>
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { dialogs, showNoteList },
}) => ({
  keyboardShortcutsAreOpen: dialogs.includes('KEYBINDINGS'),
  isNoteOpen: !showNoteList,
  showNoteList,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
