import React, { Component, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NoteList from '../note-list';
import NoteEditor from '../note-editor';

import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';
import actions from '../state/actions';

import * as S from '../state';
import * as T from '../types';

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
  keyboardShortcuts: boolean;
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

    const editorVisible = !(showNoteList && isSmallScreen);

    return (
      <div className={mainClasses}>
        <div className="app-layout__source-column theme-color-bg theme-color-fg">
          <SearchBar noteBucket={noteBucket} />
          <NoteList noteBucket={noteBucket} isSmallScreen={isSmallScreen} />
        </div>
        {editorVisible && (
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
        )}
      </div>
    );
  };
}

const mapStateToProps: S.MapState<StateProps> = ({
  ui: { dialogs, showNoteList },
  settings: { keyboardShortcuts },
}) => ({
  keyboardShortcutsAreOpen: dialogs.includes('KEYBINDINGS'),
  keyboardShortcuts,
  isNoteOpen: !showNoteList,
  showNoteList,
});

const mapDispatchToProps: S.MapDispatch<DispatchProps> = {
  hideKeyboardShortcuts: () => actions.ui.closeDialog('KEYBINDINGS'),
  showKeyboardShortcuts: () => actions.ui.showDialog('KEYBINDINGS'),
};

export default connect(mapStateToProps, mapDispatchToProps)(AppLayout);
