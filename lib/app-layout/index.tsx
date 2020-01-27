import React, { FunctionComponent, Suspense } from 'react';
import classNames from 'classnames';
import { get } from 'lodash';

import NoteToolbarContainer from '../note-toolbar-container';
import NoteToolbar from '../note-toolbar';
import RevisionSelector from '../revision-selector';
import SearchBar from '../search-bar';
import SimplenoteCompactLogo from '../icons/simplenote-compact';
import TransitionDelayEnter from '../components/transition-delay-enter';

import { NoteEntity } from '../types';

const NoteList = React.lazy(() =>
  import(/* webpackChunkName: 'note-list' */ '../note-list')
);

const NoteEditor = React.lazy(() =>
  import(/* webpackChunkName: 'note-editor' */ '../note-editor')
);

type Props = {
  isFocusMode: boolean;
  isNavigationOpen: boolean;
  isNoteInfoOpen: boolean;
  isNoteOpen: boolean;
  isSmallScreen: boolean;
  note: NoteEntity;
  noteBucket: object;
  revisions: NoteEntity[];
  onNoteClosed: Function;
  onNoteOpened: Function;
  onUpdateContent: Function;
  syncNote: Function;
};

export const AppLayout: FunctionComponent<Props> = ({
  isFocusMode = false,
  isNavigationOpen,
  isNoteInfoOpen,
  isNoteOpen,
  isSmallScreen,
  note,
  noteBucket,
  revisions,
  onNoteClosed,
  onNoteOpened,
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
          <SearchBar noteBucket={noteBucket} onNoteOpened={onNoteOpened} />
          <NoteList
            noteBucket={noteBucket}
            isSmallScreen={isSmallScreen}
            onNoteOpened={onNoteOpened}
          />
        </div>
        <div className="app-layout__note-column theme-color-bg theme-color-fg theme-color-border">
          <RevisionSelector
            note={note}
            revisions={revisions || []}
            onUpdateContent={onUpdateContent}
          />
          <NoteToolbarContainer
            onNoteClosed={onNoteClosed}
            noteBucket={noteBucket}
            toolbar={<NoteToolbar note={note} />}
          />
          <NoteEditor
            isSmallScreen={isSmallScreen}
            note={note}
            noteBucket={noteBucket}
            onNoteClosed={onNoteClosed}
            onUpdateContent={onUpdateContent}
            syncNote={syncNote}
            tags={
              get(note, 'data.tags', []) /* flattened to trigger re-render */
            }
          />
        </div>
      </Suspense>
    </div>
  );
};

export default AppLayout;
