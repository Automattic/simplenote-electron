import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

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
  note: T.NoteEntity;
  noteBucket: T.Bucket<T.Note>;
  onUpdateContent: Function;
  syncNote: Function;
};

type StateProps = {
  isNoteOpen: boolean;
  keyboardShortcutsAreOpen: boolean;
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
    }
  };

  render = () => {
    const {
      isFocusMode = false,
      isNavigationOpen,
      isNoteInfoOpen,
      isNoteOpen,
      isSmallScreen,
      noteBucket,
      onUpdateContent,
      syncNote,
    } = this.props;

    const mainClasses = classNames('app-layout', {
      'is-focus-mode': isFocusMode,
      'is-navigation-open': isNavigationOpen,
      'is-note-open': isNoteOpen,
      'is-showing-note-info': isNoteInfoOpen,
    });

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
            <SearchBar noteBucket={noteBucket} />
            <NoteList noteBucket={noteBucket} isSmallScreen={isSmallScreen} />
          </div>
          <div className="app-layout__note-column theme-color-bg theme-color-fg theme-color-border">
            <RevisionSelector onUpdateContent={onUpdateContent} />
            <NoteToolbarContainer
              noteBucket={noteBucket}
              toolbar={<NoteToolbar />}
            />
            <NoteEditor
              isSmallScreen={isSmallScreen}
              noteBucket={noteBucket}
              onUpdateContent={onUpdateContent}
              syncNote={syncNote}
            />
          </div>
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
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
