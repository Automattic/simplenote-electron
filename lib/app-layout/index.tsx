import React, { FunctionComponent, Suspense } from 'react';
import classNames from 'classnames';
import { connect } from 'react-redux';

import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';

import * as S from './state';
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
  revisions: T.NoteEntity[];
  onUpdateContent: Function;
  syncNote: Function;
};

type StateProps = {
  isNoteOpen: boolean;
};

type Props = OwnProps & StateProps;

export const AppLayout: FunctionComponent<Props> = ({
  isFocusMode = false,
  isNavigationOpen,
  isNoteInfoOpen,
  isNoteOpen,
  isSmallScreen,
  noteBucket,
  revisions,
  onUpdateContent,
  syncNote,
}) => {
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
          <RevisionSelector
            revisions={revisions || []}
            onUpdateContent={onUpdateContent}
          />
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

const mapStateToProps: S.MapState<StateProps> = ({ ui: { visiblePanes } }) => ({
  isNoteOpen: !visiblePanes.has('noteList'),
});

export default connect(mapStateToProps)(AppLayout);
